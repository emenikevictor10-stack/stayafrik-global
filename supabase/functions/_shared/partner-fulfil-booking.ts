import { fulfilRayProp } from "./rayprop-fulfil.ts";

/**
 * Turn a successful Paystack partner payment into a booking.
 * Insert-first ("processing") so a RayProp reservation is never left without a record.
 * Safe to call from paystack-verify and the Paystack webhook (unique payment_reference).
 */
export const fulfilPartnerBooking = async (admin: any, tx: any) => {
  const meta = tx.metadata || {};
  const reference = String(tx.reference);
  const userId = String(meta.user_id || "");
  if (!userId) throw new Error("Payment has no user");
  if (Number(tx.amount) !== Number(meta.amount_kobo)) throw new Error("Payment amount mismatch");

  let { data: booking } = await admin.from("bookings").select("*").eq("payment_reference", reference).maybeSingle();
  if (booking && booking.status !== "processing") return booking;

  if (!booking) {
    const { data, error } = await admin.from("bookings").insert({
      guest_id: userId, listing_id: null, source: "rayprop", status: "processing",
      check_in_date: meta.check_in, check_out_date: meta.check_out,
      total_price: Number(meta.amount_kobo) / 100, payment_reference: reference,
      rayprop_listing_id: meta.rayprop_listing_id, rayprop_quote_id: meta.quote_id, rayprop_hold_id: meta.hold_id,
      rayprop_quote_total_kobo: Number(meta.amount_kobo), rayprop_hold_expires_at: meta.hold_expires_at,
      guest_count: Number(meta.guests || 1), partner_title: meta.title, partner_image: meta.image || null, partner_city: meta.city || null,
    }).select("*").single();
    if (error) {
      // Lost a race with the other caller — return their row.
      if (error.code === "23505") {
        const { data: other } = await admin.from("bookings").select("*").eq("payment_reference", reference).maybeSingle();
        return other;
      }
      console.error("[partner-fulfil] insert failed", reference, error.message);
      throw new Error(error.message);
    }
    booking = data;
  }

  const result = await fulfilRayProp({
    reference, hold_id: meta.hold_id, quote_id: meta.quote_id, listing_id: meta.rayprop_listing_id,
    check_in: meta.check_in, check_out: meta.check_out, guests: Number(meta.guests || 1),
    guest: { name: meta.guest_name, email: meta.guest_email, phone: meta.guest_phone },
    existingReservationId: booking.rayprop_reservation_id,
  });
  const { data: updated, error: uerr } = await admin.from("bookings").update(result).eq("id", booking.id).select("*").single();
  if (uerr) console.error("[partner-fulfil] update failed", reference, uerr.message);
  const final = updated || { ...booking, ...result };

  await notify(admin, final, userId).catch((e) => console.error("[partner-fulfil] notify failed", e));
  return final;
};

const notify = async (admin: any, b: any, userId: string) => {
  const title = b.partner_title || "your stay";
  const dates = `${b.check_in_date} to ${b.check_out_date}`;
  if (b.status === "confirmed") {
    await admin.from("notifications").insert({ user_id: userId, type: "booking", title: "Booking confirmed", body: `${title} · ${dates}`, link: "/trips" });
    await admin.rpc("send_alert_email", { _user_id: userId, _subject: "Your StayGlobal booking is confirmed", _heading: "Booking confirmed",
      _body: `Your stay at <strong>${title}</strong> (${dates}) is confirmed. Booking reference: ${b.payment_reference}.`, _link: "/trips" });
    return;
  }
  if (b.status === "needs_attention") {
    await admin.from("notifications").insert({ user_id: userId, type: "booking", title: "We're finalising your booking", body: `Your payment for ${title} was received. We'll confirm shortly.`, link: "/trips" });
    await admin.rpc("send_alert_email", { _user_id: userId, _subject: "We're finalising your StayGlobal booking", _heading: "Payment received",
      _body: `We received your payment for <strong>${title}</strong> (${dates}). Our team is finalising the booking with the property and will update you shortly. Reference: ${b.payment_reference}.`, _link: "/trips" });
    const { data: admins } = await admin.from("user_roles").select("user_id").eq("role", "admin");
    for (const a of admins || []) {
      await admin.from("notifications").insert({ user_id: a.user_id, type: "admin", title: "Partner booking needs attention", body: `${title}: ${b.attention_reason || "unknown error"}`, link: "/admin/partner-bookings" });
      await admin.rpc("send_alert_email", { _user_id: a.user_id, _subject: "Partner booking needs attention", _heading: "A paid partner booking needs attention",
        _body: `<strong>${title}</strong> (${dates}), ref ${b.payment_reference}.<br/>Reason: ${String(b.attention_reason || "unknown").replace(/</g, "&lt;")}`, _link: "/admin/partner-bookings" });
    }
  }
};
