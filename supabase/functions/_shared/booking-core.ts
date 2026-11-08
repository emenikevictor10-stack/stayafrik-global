/** Booking lifecycle rules (PRD §4). Pure: no Deno APIs, so vitest can test it.
 *  The database trigger `booking_status_guard` enforces the same moves for local stays. */

export const BOOKING_STATUSES = [
  "held", "processing", "confirmed", "released", "completed",
  "expired", "declined", "cancelled", "refunded", "needs_attention", "failed", "pending",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Statuses that occupy nights on a local stay's calendar. */
export const ACTIVE_STATUSES: BookingStatus[] = ["held", "confirmed", "released", "needs_attention"];

export const ALLOWED_MOVES: Record<BookingStatus, BookingStatus[]> = {
  pending: ["held", "confirmed", "cancelled", "expired"],
  held: ["confirmed", "expired", "cancelled", "needs_attention"],
  expired: ["confirmed", "needs_attention"], // late payment for an expired hold
  processing: ["confirmed", "needs_attention", "cancelled"],
  confirmed: ["released", "completed", "cancelled", "refunded", "needs_attention", "declined"],
  released: ["completed", "cancelled", "refunded"],
  completed: ["refunded"],
  needs_attention: ["confirmed", "cancelled", "refunded"],
  cancelled: ["refunded"],
  declined: ["refunded"],
  refunded: [],
  failed: [],
};

export const canMove = (from: string, to: string) =>
  from === to || (ALLOWED_MOVES[from as BookingStatus] ?? []).includes(to as BookingStatus);

/** Guest-facing words for each step; Trips and Admin use the same. */
export const STATUS_WORDS: Record<BookingStatus, string> = {
  pending: "Waiting for payment",
  held: "Dates held, waiting for payment",
  processing: "Payment received, confirming",
  confirmed: "Confirmed",
  released: "Checked in, host payout due",
  completed: "Stay done",
  expired: "Hold expired",
  declined: "Declined",
  cancelled: "Cancelled",
  refunded: "Refunded",
  needs_attention: "Payment received, our team is finishing this",
  failed: "Payment failed",
};

export type NightPrice = { date: string; kobo: number };

/** Nightly breakdown from check-in (inclusive) to check-out (exclusive). */
export const nightlyBreakdown = (checkIn: string, checkOut: string, nightlyKobo: number): NightPrice[] => {
  const out: NightPrice[] = [];
  const d = new Date(`${checkIn}T00:00:00Z`);
  const end = new Date(`${checkOut}T00:00:00Z`);
  while (d < end && out.length < 366) {
    out.push({ date: d.toISOString().slice(0, 10), kobo: nightlyKobo });
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
};

/** Money split for a local stay: guest pays subtotal + service fee; host gets the subtotal. */
export const localSplit = (nights: NightPrice[], feeBps: number) => {
  const subtotal_kobo = nights.reduce((s, n) => s + n.kobo, 0);
  const fee_kobo = Math.round((subtotal_kobo * feeBps) / 10000);
  return { subtotal_kobo, fee_kobo, total_kobo: subtotal_kobo + fee_kobo, host_payout_kobo: subtotal_kobo };
};

/** When a new hold or payment window runs out. */
export const expiresAt = (from: Date, minutes: number) => new Date(from.getTime() + Math.max(1, minutes) * 60000);
