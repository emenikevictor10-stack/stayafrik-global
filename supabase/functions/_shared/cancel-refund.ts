// Runs the refund side of a cancellation once the booking row is already locked as cancelled.
// Shared by cancel-booking (guest/admin/host) and rayprop-webhook (partner cancels).
// deno-lint-ignore no-explicit-any
export async function runCancelRefund(admin: any, b: any, amount: number, reason: string | null, actorId: string) {
    const { data: refund } = await admin.from("refunds").insert({
      booking_id: b.id, amount, reason, initiated_by: actorId, status: amount > 0 ? "pending" : "none",
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

    await admin.from("notifications").insert({
      user_id: b.guest_id, type: "booking", title: "Booking cancelled",
      body: amount > 0 ? `Refund of ₦${amount.toLocaleString()} is on its way (3–10 working days).` : "No refund applies under the cancellation policy.",
      link: "/bookings",
    });
  await admin.from("booking_events").insert({ booking_id: b.id, type: "refund", actor: "system", actor_id: null, data: { amount, reason } }).then(() => {}, () => {});
}
