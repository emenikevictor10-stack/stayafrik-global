/** Booking lifecycle rules (PRD §4). Pure: no Deno APIs, so vitest can test it.
 *  The database trigger `booking_status_guard` enforces the same moves for local stays. */

export const BOOKING_STATUSES = [
  "held", "processing", "awaiting_host", "confirmed", "released", "completed",
  "expired", "declined", "cancelled", "refunded", "needs_attention", "failed", "pending",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Statuses that occupy nights on a local stay's calendar. */
export const ACTIVE_STATUSES: BookingStatus[] = ["held", "awaiting_host", "confirmed", "released", "needs_attention"];

export const ALLOWED_MOVES: Record<BookingStatus, BookingStatus[]> = {
  pending: ["held", "confirmed", "cancelled", "expired"],
  held: ["confirmed", "awaiting_host", "expired", "cancelled", "needs_attention"],
  expired: ["confirmed", "awaiting_host", "needs_attention"], // late payment for an expired hold
  processing: ["confirmed", "needs_attention", "cancelled"],
  awaiting_host: ["confirmed", "declined", "cancelled", "needs_attention"],
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
  awaiting_host: "Paid, waiting for the host to accept",
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

/** Host price settings for a local stay (naira, as stored on the listing). */
export type RatePlan = {
  price_per_night: number;
  weekend_price?: number | null;
  date_prices?: Record<string, number>; // "YYYY-MM-DD" -> naira
  cleaning_fee?: number | null;
  weekly_discount_pct?: number | null;
  monthly_discount_pct?: number | null;
  min_nights?: number | null;
  max_nights?: number | null;
};

export type LocalQuote =
  | { ok: false; error: string }
  | { ok: true; nights: NightPrice[]; nights_kobo: number; discount_kobo: number; discount_pct: number;
      cleaning_kobo: number; subtotal_kobo: number; fee_kobo: number; total_kobo: number; host_payout_kobo: number };

/** Weekend = Friday and Saturday nights. */
export const isWeekendNight = (date: string) => {
  const d = new Date(`${date}T00:00:00Z`).getUTCDay();
  return d === 5 || d === 6;
};

/** Full local-stay price: date price > weekend price > base; weekly (7+) or monthly (28+) discount on nights;
 *  cleaning fee once; service fee on the whole subtotal. Host gets the subtotal. Same code runs on screen and server. */
export const quoteLocalStay = (checkIn: string, checkOut: string, plan: RatePlan, feeBps: number): LocalQuote => {
  const base = nightlyBreakdown(checkIn, checkOut, 0);
  const n = base.length;
  if (n < 1) return { ok: false, error: "Pick at least one night" };
  const min = Math.max(1, plan.min_nights ?? 1);
  if (n < min) return { ok: false, error: `This stay needs at least ${min} night${min > 1 ? "s" : ""}` };
  if (plan.max_nights && n > plan.max_nights) return { ok: false, error: `This stay allows at most ${plan.max_nights} nights` };
  const nights = base.map(({ date }) => {
    const naira = plan.date_prices?.[date] ?? (isWeekendNight(date) && plan.weekend_price ? plan.weekend_price : plan.price_per_night);
    return { date, kobo: Math.round(Number(naira) * 100) };
  });
  const nights_kobo = nights.reduce((s, x) => s + x.kobo, 0);
  const discount_pct = n >= 28 && plan.monthly_discount_pct ? plan.monthly_discount_pct
    : n >= 7 && plan.weekly_discount_pct ? plan.weekly_discount_pct : 0;
  const discount_kobo = Math.round((nights_kobo * discount_pct) / 100);
  const cleaning_kobo = Math.round(Number(plan.cleaning_fee || 0) * 100);
  const subtotal_kobo = nights_kobo - discount_kobo + cleaning_kobo;
  const fee_kobo = Math.round((subtotal_kobo * feeBps) / 10000);
  return { ok: true, nights, nights_kobo, discount_kobo, discount_pct, cleaning_kobo, subtotal_kobo, fee_kobo,
    total_kobo: subtotal_kobo + fee_kobo, host_payout_kobo: subtotal_kobo };
};

/** Split a total (kobo) into n shares; any remainder goes on the first (lead) share so shares always add up exactly. */
export function splitShares(totalKobo: number, n: number): number[] {
  if (!Number.isInteger(n) || n < 2 || n > 6) throw new Error("Split between 2 and 6 people");
  const each = Math.floor(totalKobo / n);
  return Array.from({ length: n }, (_, i) => (i === 0 ? totalKobo - each * (n - 1) : each));
}

export const SPLIT_MIN_PEOPLE = 2;
export const SPLIT_MAX_PEOPLE = 6;
export const SPLIT_MIN_SHARE_KOBO = 100_000; // ₦1,000

export type CustomShare = { amount_kobo: number; name?: string | null; phone?: string | null; email?: string | null };

/** Organiser-set amounts: 2–6 people, each at least ₦1,000, adding up exactly to the total. Returns an error message or null. */
export function validateCustomShares(totalKobo: number, shares: CustomShare[]): string | null {
  if (!Array.isArray(shares) || shares.length < SPLIT_MIN_PEOPLE || shares.length > SPLIT_MAX_PEOPLE) return "Split between 2 and 6 people";
  for (const s of shares) {
    if (!Number.isInteger(s.amount_kobo) || s.amount_kobo < SPLIT_MIN_SHARE_KOBO) return "Each share must be at least ₦1,000";
    if (s.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.email)) return "Check the email addresses";
  }
  const sum = shares.reduce((a, s) => a + s.amount_kobo, 0);
  if (sum !== totalKobo) return "The shares must add up to the total";
  return null;
}

/** Mirror of split_reminders_tick: first after 1h, then every 12h, plus one in the last 2h before the hold ends. */
export function shareReminderDue(now: Date, createdAt: Date, lastRemindedAt: Date | null, holdEndsAt: Date): boolean {
  const H = 3_600_000, t = now.getTime(), end = holdEndsAt.getTime();
  if (end <= t) return false;
  if (!lastRemindedAt) return createdAt.getTime() < t - H || end < t + 2 * H;
  const last = lastRemindedAt.getTime();
  if (last < t - 12 * H) return true;
  return end < t + 2 * H && last < end - 2 * H;
}
