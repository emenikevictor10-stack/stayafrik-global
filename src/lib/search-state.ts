import { addDays, differenceInCalendarDays, format, parseISO, isValid } from "date-fns";

export const FLEX_OPTIONS = [0, 1, 2, 3, 7, 14] as const;
export type Flex = (typeof FLEX_OPTIONS)[number];
export type StayLength = "weekend" | "week" | "month";

/** The guest's whole search: place, dates and party. Kept in the web address. */
export type SearchState = {
  where: string; // label shown in the bar, e.g. "Chevron"
  loc?: string; // slug of the place picked from the list
  locType?: "state" | "city" | "neighbourhood";
  bedrooms: number; // minimum, 0 = any
  mode: "dates" | "flexible";
  checkIn?: string; // yyyy-MM-dd
  checkOut?: string; // yyyy-MM-dd, exclusive
  flex: Flex;
  stayLength: StayLength;
  months: string[]; // yyyy-MM
  adults: number;
  children: number;
  infants: number;
  pets: number;
};

export const EMPTY_SEARCH: SearchState = {
  where: "", mode: "dates", flex: 0, stayLength: "week", months: [], adults: 0, children: 0, infants: 0, pets: 0, bedrooms: 0,
};

export const LIMITS = { guests: 16, infants: 5, pets: 5 };

const int = (v: string | null, min = 0, max = 16) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
};
const day = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) && isValid(parseISO(v)) ? v : undefined);

export const parseSearch = (params: URLSearchParams): SearchState => {
  let checkIn = day(params.get("checkin") || params.get("in"));
  let checkOut = day(params.get("checkout") || params.get("out"));
  if (!checkIn || !checkOut || checkOut <= checkIn) { checkIn = undefined; checkOut = undefined; }
  const f = Number(params.get("flex"));
  const len = params.get("len");
  const months = (params.get("months") || "").split(",").filter((m) => /^\d{4}-\d{2}$/.test(m)).slice(0, 12);
  const s: SearchState = {
    where: (params.get("where") || "").slice(0, 80),
    loc: /^[a-z0-9-]{1,80}$/.test(params.get("loc") || "") ? params.get("loc")! : undefined,
    locType: (["state", "city", "neighbourhood"] as const).find((t) => t === params.get("loc_type")),
    bedrooms: int(params.get("bedrooms"), 0, 10),
    mode: params.get("mode") === "flexible" ? "flexible" : "dates",
    checkIn,
    checkOut,
    flex: (FLEX_OPTIONS as readonly number[]).includes(f) ? (f as Flex) : 0,
    stayLength: len === "weekend" || len === "month" ? len : "week",
    months,
    adults: int(params.get("adults")),
    children: int(params.get("children")),
    infants: int(params.get("infants"), 0, LIMITS.infants),
    pets: int(params.get("pets"), 0, LIMITS.pets),
  };
  return { ...s, ...applyGuests(s, {}) };
};

export const serializeSearch = (s: SearchState): URLSearchParams => {
  const p = new URLSearchParams();
  if (s.loc) { p.set("loc", s.loc); if (s.locType) p.set("loc_type", s.locType); }
  if (s.where.trim()) p.set("where", s.where.trim());
  if (s.mode === "flexible") {
    p.set("mode", "flexible");
    if (s.stayLength !== "week") p.set("len", s.stayLength);
    if (s.months.length) p.set("months", s.months.join(","));
  } else {
    if (s.checkIn && s.checkOut) { p.set("checkin", s.checkIn); p.set("checkout", s.checkOut); }
    if (s.flex) p.set("flex", String(s.flex));
  }
  if (s.adults) p.set("adults", String(s.adults));
  if (s.children) p.set("children", String(s.children));
  if (s.infants) p.set("infants", String(s.infants));
  if (s.pets) p.set("pets", String(s.pets));
  if (s.bedrooms) p.set("bedrooms", String(s.bedrooms));
  return p;
};

type Party = Pick<SearchState, "adults" | "children" | "infants" | "pets">;

/** Guest rules: kids/infants/pets need an adult; adults + children ≤ 16; infants, pets ≤ 5. */
export const applyGuests = (cur: Party, patch: Partial<Party>): Party => {
  const next = { ...cur, ...patch };
  next.children = Math.max(0, Math.min(next.children, LIMITS.guests - Math.max(next.adults, 0)));
  next.adults = Math.max(0, Math.min(next.adults, LIMITS.guests - next.children));
  next.infants = Math.max(0, Math.min(next.infants, LIMITS.infants));
  next.pets = Math.max(0, Math.min(next.pets, LIMITS.pets));
  if ((next.children || next.infants || next.pets) && next.adults < 1) next.adults = 1;
  return next;
};
/** Lowest adults allowed right now (1 while anyone else is coming). */
export const minAdults = (p: Party) => (p.children || p.infants || p.pets ? 1 : 0);

/** Guests that count toward capacity (infants and pets don't). */
export const guestCount = (s: Party) => s.adults + s.children;

export const nightsOf = (s: Pick<SearchState, "checkIn" | "checkOut" | "mode">) =>
  s.mode !== "flexible" && s.checkIn && s.checkOut ? Math.max(0, differenceInCalendarDays(parseISO(s.checkOut), parseISO(s.checkIn))) : 0;

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

/** Every date window allowed by ±flex days (same length, shifted). */
export const flexWindows = (checkIn: string, checkOut: string, flex: number): [string, string][] => {
  const a = parseISO(checkIn), b = parseISO(checkOut);
  const out: [string, string][] = [];
  for (let s = -flex; s <= flex; s++) {
    const i = addDays(a, s);
    if (i < addDays(new Date(new Date().toDateString()), 0)) continue;
    out.push([format(i, "yyyy-MM-dd"), format(addDays(b, s), "yyyy-MM-dd")]);
  }
  return out.length ? out : [[checkIn, checkOut]];
};

/** A stay is free if any allowed window has no blocked night. */
export const anyWindowFree = (blocked: Set<string>, checkIn: string, checkOut: string, flex: number) =>
  flexWindows(checkIn, checkOut, flex).some(([i, o]) => !overlapsBlocked(blocked, i, o));

/** Widest date span to fetch availability for. */
export const flexSpan = (checkIn: string, checkOut: string, flex: number): [string, string] => [
  format(addDays(parseISO(checkIn), -flex), "yyyy-MM-dd"),
  format(addDays(parseISO(checkOut), flex), "yyyy-MM-dd"),
];

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

export const whenSummary = (s: SearchState) => {
  if (s.mode === "flexible") {
    const len = { weekend: "Weekend", week: "Week", month: "Month" }[s.stayLength];
    if (!s.months.length) return "Anytime";
    const names = s.months.map((m) => format(parseISO(`${m}-01`), s.months.length === 1 ? "MMMM" : "MMM"));
    return `${len} in ${names.join(", ")}`;
  }
  if (!s.checkIn) return "";
  const a = parseISO(s.checkIn);
  if (!s.checkOut) return format(a, "d MMM");
  const b = parseISO(s.checkOut);
  const range = a.getMonth() === b.getMonth() ? `${format(a, "d")}–${format(b, "d MMM")}` : `${format(a, "d MMM")} – ${format(b, "d MMM")}`;
  return `${range}${s.flex ? ` ±${s.flex}` : ""}`;
};

export const whoSummary = (s: Party & { bedrooms?: number }) => {
  const g = guestCount(s);
  if (!g && !s.infants && !s.pets && !s.bedrooms) return "";
  const parts = g ? [plural(g, "guest")] : [];
  if (s.infants) parts.push(plural(s.infants, "infant"));
  if (s.pets) parts.push(plural(s.pets, "pet"));
  if (s.bedrooms) parts.push(`${s.bedrooms}+ bedroom${s.bedrooms === 1 ? "" : "s"}`);
  return parts.join(", ");
};

export const summarize = (s: SearchState) => ({
  where: s.where || "Anywhere",
  when: whenSummary(s) || "Anytime",
  who: whoSummary(s) || "Add guests",
});

/** Last search, so the booking screen can prefill dates and guests. */
const KEY = "stay:search:v1";
export const rememberSearch = (s: SearchState) => {
  try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
};
export const recallSearch = (): SearchState | null => {
  try { return JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch { return null; }
};
