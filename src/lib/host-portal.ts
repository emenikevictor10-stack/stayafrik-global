/** Pure host-portal helpers (tested). */
export type HostBooking = {
  id: string; status: string; check_in_date: string; check_out_date: string;
  total_price: number; host_payout_kobo: number | null; host_respond_by?: string | null;
};

/** Statuses a host treats as a real stay (paid and accepted). */
export const STAY_STATUSES = ["confirmed", "released", "completed"];

/** Upcoming = check-in after today; Current = today within the stay; Past = checked out or finished. */
export const groupBookings = <T extends HostBooking>(rows: T[], today: string) => {
  const stays = rows.filter((r) => STAY_STATUSES.includes(r.status));
  return {
    upcoming: stays.filter((r) => r.check_in_date > today).sort((a, b) => a.check_in_date.localeCompare(b.check_in_date)),
    current: stays.filter((r) => r.check_in_date <= today && r.check_out_date > today),
    past: stays.filter((r) => r.check_out_date <= today).sort((a, b) => b.check_out_date.localeCompare(a.check_out_date)),
  };
};

/** Host share in naira: the amount saved on the booking; old rows without it fall back to the total. */
export const hostShare = (r: HostBooking) => (r.host_payout_kobo != null ? r.host_payout_kobo / 100 : Number(r.total_price) || 0);

/** Held = confirmed, not yet released; Due = released (payout being sent); Done = stay completed. */
export const payoutTotals = (rows: HostBooking[]) => {
  const sum = (s: string) => rows.filter((r) => r.status === s).reduce((t, r) => t + hostShare(r), 0);
  return { held: sum("confirmed"), due: sum("released"), done: sum("completed") };
};

/** First name only until the booking is confirmed. Mirrors the host_booking_guests database function. */
export const guestDisplayName = (fullName: string | null | undefined, status: string) => {
  const n = (fullName ?? "").trim();
  if (!n) return "Guest";
  return STAY_STATUSES.includes(status) ? n : n.split(/\s+/)[0];
};

/** "5h 12m left" style countdown for a reply deadline. */
export const timeLeft = (iso: string | null | undefined, now = Date.now()) => {
  if (!iso) return "";
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return "Time is up";
  const h = Math.floor(ms / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000);
  return h ? `${h}h ${m}m left` : `${m}m left`;
};
