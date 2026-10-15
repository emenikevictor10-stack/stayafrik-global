import { raypropConfirmPayment, raypropReservation, unwrapRayProp } from "./rayprop.ts";

type Guest = { name: string; email: string; phone: string };

/**
 * After Paystack succeeds: create the RayProp reservation and pay it from the prefunded wallet.
 * Never throws — returns the fields to store on the booking.
 */
export const fulfilRayProp = async (input: {
  reference: string;
  hold_id: string;
  quote_id: string;
  listing_id: string;
  check_in: string;
  check_out: string;
  guests: number;
  guest: Guest;
  existingReservationId?: string | null;
}) => {
  let reservationId = input.existingReservationId || "";
  try {
    if (!reservationId) {
      const r = unwrapRayProp(await raypropReservation({
        hold_id: input.hold_id,
        quote_id: input.quote_id,
        listing_id: input.listing_id,
        guest_name: input.guest.name,
        guest_email: input.guest.email,
        guest_phone: input.guest.phone,
        check_in_date: input.check_in,
        check_out_date: input.check_out,
        guest_count: input.guests,
      }));
      reservationId = String(r?.reservation_id || r?.id || "");
      if (!reservationId) throw new Error("RayProp did not return a reservation id");
    }
    await raypropConfirmPayment(reservationId, `stay_${input.reference}`);
    return { status: "confirmed", rayprop_reservation_id: reservationId, attention_reason: null as string | null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[rayprop-fulfil] failed", msg);
    return { status: "needs_attention", rayprop_reservation_id: reservationId || null, attention_reason: msg.slice(0, 500) };
  }
};
