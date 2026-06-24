// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

type DeliveryResult = { ok: true; reason?: string } | { ok: false; reason?: string; detail?: string };

async function sha256(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sendSmsTwilio(to: string, body: string) {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const twilioKey = Deno.env.get("TWILIO_API_KEY");
  const from = Deno.env.get("TWILIO_FROM_NUMBER") || Deno.env.get("TWILIO_PHONE_NUMBER");
  if (!lovableKey || !twilioKey || !from) {
    return { ok: false, reason: "twilio_not_configured" as const };
  }
  const res = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": twilioKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  });
  if (!res.ok) {
    const txt = await res.text();
    return { ok: false, reason: "twilio_error" as const, detail: txt };
  }
  return { ok: true };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function enqueueOtpEmail(to: string, code: string) {
  const senderDomain = "notify.stayglobal.app";
  const subject = "Your StayGlobal verification code";
  const text = `Your StayGlobal verification code is ${code}\n\nIt expires in 10 minutes. If you didn't request this, ignore this email.`;
  const safeCode = escapeHtml(code);
  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#111827;">
    <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:28px;">
        <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#111827;">StayGlobal verification code</h1>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#4b5563;">Use this code to finish signing in to your admin account.</p>
        <div style="letter-spacing:6px;font-size:30px;font-weight:700;background:#f1f5f9;border-radius:10px;padding:18px 20px;text-align:center;color:#111827;">${safeCode}</div>
        <p style="margin:20px 0 0;font-size:13px;line-height:1.5;color:#6b7280;">This code expires in 10 minutes. If you didn't request it, you can ignore this email.</p>
      </div>
    </div>
  </body>
</html>`;

  const messageId = crypto.randomUUID();
  const payload = {
    message_id: messageId,
    to,
    from: `StayGlobal <noreply@${senderDomain}>`,
    sender_domain: senderDomain,
    subject,
    html,
    text,
    purpose: "transactional",
    label: "admin_otp",
    idempotency_key: `admin-otp-${messageId}`,
    queued_at: new Date().toISOString(),
  };

  const { error } = await supabase.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload,
  });

  if (error) {
    return { ok: false, reason: "email_queue_error" as const, detail: error.message };
  }

  await supabase.from("email_send_log").insert({
    message_id: messageId,
    template_name: "admin_otp",
    recipient_email: to,
    status: "pending",
  });

  return { ok: true, reason: "queued" as const };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { identifier, channel } = await req.json();
    if (!identifier || !["phone", "email"].includes(channel)) {
      return new Response(JSON.stringify({ error: "invalid_input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: max 1 send per 30s per identifier+channel
    const { data: recent } = await supabase
      .from("otp_codes")
      .select("created_at")
      .eq("identifier", identifier)
      .eq("channel", channel)
      .order("created_at", { ascending: false })
      .limit(1);
    if (recent && recent.length > 0) {
      const ageMs = Date.now() - new Date(recent[0].created_at).getTime();
      if (ageMs < 30_000) {
        return new Response(JSON.stringify({ error: "rate_limited", retry_in_ms: 30_000 - ageMs }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const code_hash = await sha256(code);
    const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await supabase.from("otp_codes").insert({
      identifier,
      channel,
      code_hash,
      expires_at,
    });

    let delivery: DeliveryResult = { ok: false };
    if (channel === "phone") {
      delivery = await sendSmsTwilio(identifier, `Your StayGlobal verification code is ${code}. It expires in 10 minutes.`);
    } else {
      delivery = await enqueueOtpEmail(identifier, code);
    }

    // In dev / not configured: return the code so the UI can show it (toast).
    // We never include it when delivery succeeded.
    const body: { sent: boolean; dev_code?: string; delivery_status?: string } = { sent: !!delivery.ok };
    if (!delivery.ok) {
      body.dev_code = code;
      body.delivery_status = delivery.reason ?? "unknown";
      console.warn("OTP delivery fallback", channel, delivery);
    }

    return new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "unknown";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
