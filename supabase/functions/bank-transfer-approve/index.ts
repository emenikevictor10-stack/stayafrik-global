// Staff approve a partner (RayProp) bank transfer: fresh price + hold, then reserve via the shared fulfil path.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { fulfilPartnerBooking } from "../_shared/partner-fulfil-booking.ts";
import { raypropHold, raypropQuote, unwrapRayProp } from "../_shared/rayprop.ts";
import { getSetting } from "../_shared/settings.ts";

const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });
    const user = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: c } = await user.auth.getClaims(auth.slice(7));
    const staffId = c?.claims?.sub as string | undefined;
    if (!staffId) return json(401, { error: "Unauthorized" });
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", staffId).in("role", ["admin", "finance"]);
    if (!roles?.length) return json(403, { error: "Not allowed" });

    const { id } = await req.json().catch(() => ({}));
    if (typeof id !== "string" || id.length > 64) return json(400, { error: "Missing transfer" });
    const { data: t } = await admin.from("bank_transfers").select("*").eq("id", id).maybeSingle();
    if (!t || t.source !== "rayprop") return json(404, { error: "Transfer not found" });
    if (!["submitted", "awaiting_proof"].includes(t.status)) return json(409, { error: "Already decided" });
    // Claim it first so two staff can't book twice.
    const { data: claimed } = await admin.from("bank_transfers").update({ status: "approved", decided_by: staffId, decided_at: new Date().toISOString() })
      .eq("id", id).in("status", ["submitted", "awaiting_proof"]).select("id").maybeSingle();
    if (!claimed) return json(409, { error: "Already decided" });

    const m = t.meta || {};
    let quote_id = m.quote_id, hold_id = m.hold_id, hold_expires_at: string | null = null, note: string | null = null;
    try {
      const markup = Math.max(0, await getSetting<number>("markup_per_night_kobo", 0));
      const q = unwrapRayProp(await raypropQuote({ listing_id: m.rayprop_listing_id, check_in_date: t.check_in, check_out_date: t.check_out, guest_count: Number(m.guests || 1), ...(markup ? { developer_markup_per_night: markup } : {}) }));
      const newTotal = Math.round(Number(q?.pricing?.total_amount || 0));
      if (!newTotal || newTotal > Number(t.amount_kobo)) note = newTotal ? `Price went up to ₦${(newTotal / 100).toLocaleString()} (paid ₦${(t.amount_kobo / 100).toLocaleString()})` : "Stay is no longer available";
      else {
        const h = unwrapRayProp(await raypropHold({ quote_id: q.id, guest_name: m.guest_name, guest_phone: m.guest_phone, guest_email: m.guest_email }));
        quote_id = q.id; hold_id = h.id; hold_expires_at = h.expires_at || null;
      }
    } catch (e) { note = (e as Error).message || "Stay is no longer available"; }

    const reference = t.reference;
    const meta = { user_id: t.guest_id, rayprop_listing_id: m.rayprop_listing_id, quote_id, hold_id, amount_kobo: Number(t.amount_kobo), markup_kobo: m.markup_kobo,
      check_in: t.check_in, check_out: t.check_out, guests: m.guests, title: t.title, image: m.image, city: m.city, hold_expires_at,
      guest_name: m.guest_name, guest_email: m.guest_email, guest_phone: m.guest_phone };

    let booking: any;
    if (note) {
      const { data } = await admin.from("bookings").insert({
        guest_id: t.guest_id, source: "rayprop", status: "needs_attention", attention_reason: `Bank transfer approved but: ${note}`,
        check_in_date: t.check_in, check_out_date: t.check_out, total_price: Number(t.amount_kobo) / 100, payment_reference: reference,
        rayprop_listing_id: m.rayprop_listing_id, paid_at: new Date().toISOString(), guest_count: Number(m.guests || 1),
        partner_title: t.title, partner_image: m.image || null, partner_city: m.city || null,
      }).select("*").single();
      booking = data;
      await admin.rpc("notify_admins", { _title: "Partner bank transfer needs attention", _body: note, _link: "/admin/partner-bookings" });
      await admin.from("notifications").insert({ user_id: t.guest_id, type: "payment", title: "Payment received", body: "We received your transfer. Our team is finalising your stay and will contact you shortly.", link: "/bookings" });
    } else {
      booking = await fulfilPartnerBooking(admin, { reference, amount: Number(t.amount_kobo), metadata: meta });
    }
    if (booking?.id) await admin.from("bank_transfers").update({ booking_id: booking.id }).eq("id", id);
    await admin.from("admin_audit_log").insert({ actor_id: staffId, action: "bank_transfer_approve", entity_type: "bank_transfer", entity_id: id, metadata: { reference, amount_kobo: t.amount_kobo, result: booking?.status, note } });
    return json(200, { status: booking?.status, note });
  } catch (e) {
    console.error("[bank-transfer-approve]", e);
    return json(500, { error: (e as Error).message || "Could not approve" });
  }
});
