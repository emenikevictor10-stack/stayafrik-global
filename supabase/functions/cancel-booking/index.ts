import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { cancelRefund, type CancelActor } from "../_shared/cancellation-core.ts";
import { runCancelRefund } from "../_shared/cancel-refund.ts";
import { raypropCancel } from "../_shared/rayprop.ts";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Cancels a booking (own or RayProp) and refunds.
// Guest: policy refund. Host (own stays): full refund, reason required. Admin: may set amount, reason required.
// RayProp stays are also cancelled with RayProp before we refund.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: u } = await admin.auth.getUser(token);
    if (!u?.user) return json({ error: "Please sign in again" }, 401);

    const body = await req.json().catch(() => ({}));
    const bookingId = typeof body.booking_id === "string" ? body.booking_id : "";
    const preview = body.preview === true;
    if (!/^[0-9a-f-]{36}$/i.test(bookingId)) return json({ error: "Invalid booking" }, 400);

    const { data: b } = await admin.from("bookings").select("*").eq("id", bookingId).maybeSingle();
    if (!b) return json({ error: "Booking not found" }, 404);

    const { data: isAdmin } = await admin.from("user_roles").select("id").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    const asStaff = body.as === "admin" && !!isAdmin;
    let actor: CancelActor;
    if (asStaff) actor = "admin";
    else if (b.guest_id === u.user.id) actor = "guest";
    else if (b.source !== "rayprop" && b.host_id === u.user.id) actor = "host";
    else if (isAdmin) actor = "admin";
    else return json({ error: "Not allowed" }, 403);
    if (b.status !== "confirmed") return json({ error: "This booking can no longer be cancelled" }, 409);

    let refund;
    try {
      refund = cancelRefund({ total: Number(b.total_price), checkInDate: b.check_in_date, actor, adminAmount: actor === "admin" && typeof body.amount === "number" ? body.amount : undefined });
    } catch { return json({ error: "Invalid amount" }, 400); }
    const { amount, percent } = refund;
    if (preview) return json({ amount, percent, total: b.total_price, actor });

    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
    if ((actor === "admin" || actor === "host") && reason.length < 3) return json({ error: "Please give a reason" }, 400);

    // Partner stays: RayProp must accept the cancel first.
    if (b.source === "rayprop" && b.rayprop_reservation_id) {
      const r = await raypropCancel(b.rayprop_reservation_id, reason || "Guest requested cancellation").catch((e) => ({ ok: false, error: e }));
      // deno-lint-ignore no-explicit-any
      const res: any = r;
      if (res?.ok === false || res?.success === false || res?.error) {
        console.error("rayprop cancel failed", res?.error ?? res);
        return json({ error: "The partner couldn't cancel this stay right now. Please try again or contact support." }, 502);
      }
    }

    const label = actor === "host" ? "Cancelled by host" : actor === "admin" ? "Cancelled by StayGlobal" : "Cancelled by guest";
    const { data: locked } = await admin.from("bookings").update({ status: "cancelled", cancelled_reason: reason ? `${label}: ${reason}` : label })
      .eq("id", b.id).eq("status", "confirmed").select("id").maybeSingle();
    if (!locked) return json({ error: "This booking can no longer be cancelled" }, 409);

    await runCancelRefund(admin, b, amount, reason || null, u.user.id);

    if (actor !== "guest") {
      await admin.from("admin_audit_log").insert({ actor_id: u.user.id, action: actor === "host" ? "booking_host_cancel" : "booking_cancel_refund", entity_type: "booking", entity_id: b.id, metadata: { amount, reason } });
    }
    if (actor === "host") {
      await admin.rpc("notify_admins", { _title: "Host cancelled a booking", _body: `${b.listing_code ?? ""} ${b.check_in_date} — guest refunded ₦${amount.toLocaleString()}. Reason: ${reason}`, _link: "/admin/bookings" });
    }
    return json({ ok: true, amount, percent });
  } catch (e) {
    console.error(e);
    return json({ error: "Could not cancel right now" }, 500);
  }
});
