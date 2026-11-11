import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { runCancelRefund } from "../_shared/cancel-refund.ts";
import { mapRayPropStatus, verifyRayPropSignature } from "../_shared/rayprop-core.ts";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const secret = Deno.env.get("RAYPROP_WEBHOOK_SECRET")?.trim();
  if (!secret) return json(503, { error: "Webhook is not configured" });

  const raw = await req.text();
  if (!(await verifyRayPropSignature(raw, req.headers.get("x-rayprop-signature"), secret))) {
    console.error("[rayprop-webhook] invalid signature");
    return json(401, { error: "Invalid signature" });
  }

  try {
    const event = JSON.parse(raw);
    const type = String(event?.event || event?.type || event?._meta?.event || "");
    const data = event?.data || {};
    const reservationId = String(data?.reservation_id || data?.id || event?.reservation_id || "").trim();
    const eventId = String(event?._meta?.event_id || event?.id || `${type}:${reservationId}:${event?._meta?.timestamp}`);
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { error: dupErr } = await db.from("rayprop_events").insert({ event_id: eventId, event_type: type, reservation_id: reservationId || null, payload: event });
    if (dupErr?.code === "23505") return json(200, { ok: true, duplicate: true });

    if (!reservationId) return json(200, { ok: true, ignored: true });
    const status = mapRayPropStatus(type) || mapRayPropStatus(String(data?.status || ""));
    if (!status) return json(200, { ok: true, ignored: true });

    if (status === "cancelled") {
      // RayProp cancelled a stay we sold: refund the guest in full and tell staff.
      const { data: locked } = await db.from("bookings").update({ status: "cancelled", cancelled_reason: "Cancelled by partner" })
        .eq("source", "rayprop").eq("rayprop_reservation_id", reservationId).eq("status", "confirmed").select("*").maybeSingle();
      if (locked) {
        await runCancelRefund(db, locked, Math.round(Number(locked.total_price)), "Cancelled by partner", locked.guest_id);
        await db.rpc("notify_admins", { _title: "RayProp cancelled a booking", _body: `${locked.listing_code ?? reservationId} from ${locked.check_in_date} — guest refunded in full.`, _link: "/admin/partner-bookings" });
        return json(200, { ok: true, refunded: true });
      }
    }
    const { error } = await db.from("bookings").update({ status }).eq("source", "rayprop").eq("rayprop_reservation_id", reservationId);
    if (error) return json(500, { error: "Could not update booking" });
    return json(200, { ok: true });
  } catch (error) {
    console.error("[rayprop-webhook] error", error);
    return json(400, { error: "Invalid webhook payload" });
  }
});
