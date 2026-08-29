import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const signatureFor = async (raw: string, secret: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const secret = Deno.env.get("RAYPROP_WEBHOOK_SECRET")?.trim();
  if (!secret) return json(503, { error: "Webhook is not configured" });

  const raw = await req.text();
  const provided = (req.headers.get("x-rayprop-signature") || "").replace(/^sha256=/, "").toLowerCase();
  const expected = await signatureFor(raw, secret);
  if (!provided || provided !== expected) return json(401, { error: "Invalid signature" });

  try {
    const event = JSON.parse(raw);
    const reservationId = String(event?.data?.reservation_id || event?.data?.id || event?.reservation_id || "").trim();
    if (!reservationId) return json(200, { ok: true, ignored: true });

    const rawStatus = String(event?.data?.status || event?.status || "").toLowerCase();
    const status = rawStatus.includes("cancel") ? "cancelled" : rawStatus.includes("fail") ? "failed" : rawStatus.includes("complete") || rawStatus.includes("confirm") ? "confirmed" : rawStatus || "pending";
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error } = await admin.from("bookings").update({ status }).eq("source", "rayprop").eq("rayprop_reservation_id", reservationId);
    if (error) return json(500, { error: "Could not update booking" });
    return json(200, { ok: true });
  } catch (error) {
    console.error("[rayprop-webhook] error", error);
    return json(400, { error: "Invalid webhook payload" });
  }
});
