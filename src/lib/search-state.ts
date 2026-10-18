import { differenceInCalendarDays, format, parseISO, isValid } from "date-fns";

/** The guest's whole search: place, dates and party. Kept in the web address. */
export type SearchState = {
  where: string;
  checkIn?: string; // yyyy-MM-dd
  checkOut?: string; // yyyy-MM-dd, exclusive
  flex: 0 | 1 | 3;
  adults: number;
  children: number;
  infants: number;
};

export const EMPTY_SEARCH: SearchState = { where: "", flex: 0, adults: 0, children: 0, infants: 0 };

const int = (v: string | null, min = 0, max = 16) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
};
const day = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) && isValid(parseISO(v)) ? v : undefined);

export const parseSearch = (params: URLSearchParams): SearchState => {
  let checkIn = day(params.get("in"));
  let checkOut = day(params.get("out"));
  if (!checkIn || !checkOut || checkOut <= checkIn) { checkIn = undefined; checkOut = undefined; }
  const f = Number(params.get("flex"));
  return {
    where: (params.get("where") || "").slice(0, 80),
    checkIn,
    checkOut,
    flex: f === 1 || f === 3 ? f : 0,
    adults: int(params.get("adults")),
    children: int(params.get("children")),
    infants: int(params.get("infants"), 0, 5),
  };
};

export const serializeSearch = (s: SearchState): URLSearchParams => {
  const p = new URLSearchParams();
  if (s.where.trim()) p.set("where", s.where.trim());
  if (s.checkIn && s.checkOut) { p.set("in", s.checkIn); p.set("out", s.checkOut); }
  if (s.flex) p.set("flex", String(s.flex));
  if (s.adults) p.set("adults", String(s.adults));
  if (s.children) p.set("children", String(s.children));
  if (s.infants) p.set("infants", String(s.infants));
  return p;
};

/** Guests that count toward capacity (infants don't). */
export const guestCount = (s: SearchState) => s.adults + s.children;

export const nightsOf = (s: SearchState) =>
  s.checkIn && s.checkOut ? Math.max(0, differenceInCalendarDays(parseISO(s.checkOut), parseISO(s.checkIn))) : 0;

export const totalPrice = (nightly: number, nights: number) => Math.max(0, Math.round(nightly * nights));

/** Capacity: listing max guests when known, else 2 per bedroom (min 2). */
export const capacityOf = (p: { maxGuests?: number; beds: number }) => p.maxGuests || Math.max(2, (p.beds || 1) * 2);

export const fitsGuests = (p: { maxGuests?: number; beds: number }, guests: number) => guests <= 0 || capacityOf(p) >= guests;

/** True when [checkIn, checkOut) overlaps any blocked night. */
export const overlapsBlocked = (blocked: Set<string>, checkIn: string, checkOut: string) => {
  const d = parseISO(checkIn);
  const end = parseISO(checkOut);
  while (d < end) {
    if (blocked.has(format(d, "yyyy-MM-dd"))) return true;
    d.setDate(d.getDate() + 1);
  }
  return false;
};

export const summarize = (s: SearchState) => {
  const when = s.checkIn && s.checkOut
    ? `${format(parseISO(s.checkIn), "d MMM")} – ${format(parseISO(s.checkOut), "d MMM")}${s.flex ? ` ±${s.flex}` : ""}`
    : "Any week";
  const g = guestCount(s);
  const who = g ? `${g} guest${g > 1 ? "s" : ""}${s.infants ? `, ${s.infants} infant${s.infants > 1 ? "s" : ""}` : ""}` : "Add guests";
  return { where: s.where || "Anywhere", when, who };
};

/** Last search, so the booking screen can prefill dates and guests. */
const KEY = "stay:search:v1";
export const rememberSearch = (s: SearchState) => {
  try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
};
export const recallSearch = (): SearchState | null => {
  try { return JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch { return null; }
};
