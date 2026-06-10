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

async function sendEmailMailgun(to: string, subject: string, text: string) {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const mgKey = Deno.env.get("MAILGUN_CONNECTION_KEY") || Deno.env.get("MAILGUN_API_KEY");
  const domain = Deno.env.get("MAILGUN_DOMAIN");
  if (!lovableKey || !mgKey || !domain) {
    return { ok: false, reason: "email_not_configured" as const };
  }
  const res = await fetch(`https://connector-gateway.lovable.dev/mailgun/${domain}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": mgKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      from: `StayGlobal <noreply@${domain}>`,
      to,
      subject,
      text,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    return { ok: false, reason: "email_error" as const, detail: txt };
  }
  return { ok: true };
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

    let delivery: any = { ok: false };
    if (channel === "phone") {
      delivery = await sendSmsTwilio(identifier, `Your StayGlobal verification code is ${code}. It expires in 10 minutes.`);
    } else {
      delivery = await sendEmailMailgun(
        identifier,
        "Your StayGlobal verification code",
        `Your StayGlobal verification code is ${code}\n\nIt expires in 10 minutes. If you didn't request this, ignore this email.`,
      );
    }

    // In dev / not configured: return the code so the UI can show it (toast).
    // We never include it when delivery succeeded.
    const body: any = { sent: !!delivery.ok };
    if (!delivery.ok) {
      body.dev_code = code;
      body.delivery_status = delivery.reason ?? "unknown";
      console.warn("OTP delivery fallback", channel, delivery);
    }

    return new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
