import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { refundAmount, refundPercent } from "../_shared/cancellation-core.ts";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Cancels a local (non-partner) booking and refunds through Paystack.
// Guests: refund per policy. Admins: may pass amount (partial/full) + reason.
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
    if (b.source === "rayprop") return json({ error: "Partner stays are cancelled from My Bookings" }, 400);

    const { data: isAdmin } = await admin.from("user_roles").select("id").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    if (b.guest_id !== u.user.id && !isAdmin) return json({ error: "Not allowed" }, 403);
    if (b.status !== "confirmed") return json({ error: "This booking can no longer be cancelled" }, 409);

    let amount = refundAmount(b.total_price, b.check_in_date);
    let percent = refundPercent(b.check_in_date);
    if (isAdmin && typeof body.amount === "number") {
      if (body.amount < 0 || body.amount > Number(b.total_price)) return json({ error: "Invalid amount" }, 400);
      amount = Math.round(body.amount);
      percent = Math.round((amount / Number(b.total_price)) * 100);
    }
    if (preview) return json({ amount, percent, total: b.total_price });

    const reason = typeof body.reason === "string" ? body.reason.slice(0, 500) : null;
    // Lock: only one cancellation wins
    const { data: locked } = await admin.from("bookings").update({ status: "cancelled", cancelled_reason: reason })
      .eq("id", b.id).eq("status", "confirmed").select("id").maybeSingle();
    if (!locked) return json({ error: "This booking can no longer be cancelled" }, 409);

    const { data: refund } = await admin.from("refunds").insert({
      booking_id: b.id, amount, reason, initiated_by: u.user.id, status: amount > 0 ? "pending" : "none",
    }).select("id").single();

    const isBankTransfer = String(b.payment_reference || "").startsWith("STAYBT_");
    if (amount > 0 && isBankTransfer) {
      // Paid by bank transfer: Paystack can't refund it; staff send it back by transfer.
      await admin.from("refunds").update({ status: "manual", failure_reason: "Paid by bank transfer — send the refund to the guest's bank account" }).eq("id", refund!.id);
      await admin.rpc("notify_admins", { _title: "Bank transfer refund to send", _body: `Refund ₦${amount.toLocaleString()} for ref ${b.payment_reference} by bank transfer.`, _link: "/admin/payments" });
    } else if (amount > 0 && b.payment_reference) {
      const r = await fetch("https://api.paystack.co/refund", {
        method: "POST",
        headers: { Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`, "Content-Type": "application/json" },
        body: JSON.stringify({ transaction: b.payment_reference, amount: amount * 100 }),
      });
      const pj = await r.json().catch(() => ({}));
      if (r.ok && pj.status) {
        await admin.from("refunds").update({ status: "processing", paystack_reference: String(pj.data?.id ?? "") }).eq("id", refund!.id);
        await admin.from("bookings").update({ status: "refunded" }).eq("id", b.id);
      } else {
        console.error("paystack refund failed", pj);
        await admin.from("refunds").update({ status: "failed", failure_reason: pj.message ?? "Refund failed" }).eq("id", refund!.id);
      }
    }

    // Extras go with the stay: unpaid ones are cancelled, paid ones refunded in full.
    const { data: extras } = await admin.from("addon_orders").select("id,status,amount_kobo,reference,addon_name")
      .eq("booking_id", b.id).in("status", ["pending_payment", "paid", "needs_attention", "confirmed"]);
    let extrasRefundDue = 0;
    for (const o of extras ?? []) {
      if (o.status === "pending_payment") {
        await admin.from("addon_orders").update({ status: "cancelled" }).eq("id", o.id);
        await admin.from("bank_transfers").update({ status: "expired" }).eq("reference", o.reference).eq("status", "awaiting_proof");
        continue;
      }
      let done = false;
      if (String(o.reference || "").startsWith("STAYADD_")) {
        const r = await fetch("https://api.paystack.co/refund", {
          method: "POST",
          headers: { Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`, "Content-Type": "application/json" },
          body: JSON.stringify({ transaction: o.reference, amount: Number(o.amount_kobo) }),
        }).catch(() => null);
        const pj = r ? await r.json().catch(() => ({})) : {};
        done = !!(r?.ok && (pj as any).status);
      }
      await admin.from("addon_orders").update({ status: done ? "refunded" : "refund_due", staff_note: done ? "Refunded with the stay" : "Stay cancelled — send this refund" }).eq("id", o.id);
      if (!done) extrasRefundDue += Number(o.amount_kobo);
    }
    if (extrasRefundDue > 0) {
      await admin.rpc("notify_admins", { _title: "Extras refund to send", _body: `₦${(extrasRefundDue / 100).toLocaleString()} for extras on a cancelled stay.`, _link: "/admin/addons" });
    }

    if (isAdmin) {
      await admin.from("admin_audit_log").insert({ actor_id: u.user.id, action: "booking_cancel_refund", entity_type: "booking", entity_id: b.id, metadata: { amount, reason } });
    }
    await admin.from("notifications").insert({
      user_id: b.guest_id, type: "booking", title: "Booking cancelled",
      body: amount > 0 ? `Refund of ₦${amount.toLocaleString()} is on its way (3–10 working days).` : "No refund applies under the cancellation policy.",
      link: "/bookings",
    });
    return json({ ok: true, amount, percent });
  } catch (e) {
    console.error(e);
    return json({ error: "Could not cancel right now" }, 500);
  }
});
