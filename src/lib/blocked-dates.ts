// Pure helpers for booking-calendar blocked dates — no browser/Deno APIs, unit-testable.

export type DateRange = { check_in: string; check_out: string }; // ISO yyyy-MM-dd, check-out exclusive

const toKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Expand booked ranges into a Set of blocked day keys (check-in day included, check-out day free). */
export const rangesToBlockedSet = (ranges: DateRange[]): Set<string> => {
  const blocked = new Set<string>();
  for (const r of ranges) {
    const start = new Date(r.check_in + "T00:00:00");
    const end = new Date(r.check_out + "T00:00:00");
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) continue;
    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      blocked.add(toKey(d));
    }
  }
  return blocked;
};

export const isBlocked = (blocked: Set<string>, d: Date): boolean => blocked.has(toKey(d));

/** True when any night in [from, to) is blocked. */
export const rangeHitsBlocked = (blocked: Set<string>, from: Date, to: Date): boolean => {
  for (let d = new Date(from); d < to; d.setDate(d.getDate() + 1)) {
    if (blocked.has(toKey(d))) return true;
  }
  return false;
};

/** First blocked day strictly after `from` — check-out may not go past it. */
export const nextBlockedAfter = (blocked: Set<string>, from: Date, horizonDays = 730): Date | null => {
  const d = new Date(from);
  for (let i = 1; i <= horizonDays; i++) {
    d.setDate(d.getDate() + 1);
    if (blocked.has(toKey(d))) return new Date(d);
  }
  return null;
};
