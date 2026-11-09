import type { Property } from "@/data/properties";

export type SortKey = "recommended" | "price_asc" | "price_desc" | "rating" | "newest";
export type PowerKey = "24h" | "generator" | "inverter" | "solar";
export type KindKey = "apartment" | "studio" | "duplex" | "house" | "penthouse";

export const SORTS: { key: SortKey; label: string }[] = [
  { key: "recommended", label: "Recommended" },
  { key: "price_asc", label: "Price: low to high" },
  { key: "price_desc", label: "Price: high to low" },
  { key: "rating", label: "Rating" },
  { key: "newest", label: "Newest" },
];
export const POWER: { key: PowerKey; label: string }[] = [
  { key: "24h", label: "24h power" },
  { key: "generator", label: "Generator" },
  { key: "inverter", label: "Inverter" },
  { key: "solar", label: "Solar" },
];
export const KINDS: { key: KindKey; label: string }[] = [
  { key: "apartment", label: "Apartment" },
  { key: "studio", label: "Studio" },
  { key: "duplex", label: "Duplex" },
  { key: "house", label: "House" },
  { key: "penthouse", label: "Penthouse" },
];

export type Filters = {
  sort: SortKey;
  minPrice?: number;
  maxPrice?: number;
  beds?: number; // minimum bedrooms (4 = 4+)
  kinds: KindKey[];
  power: PowerKey[];
  water: boolean;
  verified: boolean;
  rating4: boolean;
};

export const emptyFilters = (): Filters => ({ sort: "recommended", kinds: [], power: [], water: false, verified: false, rating4: false });

export const PAGE_SIZE = 12;

const text = (p: Property) => p.amenities.map((a) => a.label.toLowerCase()).join(" | ");
const words = (p: Property) => `${p.title} ${p.desc || ""}`.toLowerCase();

export const powerTags = (p: Property): PowerKey[] => {
  const t = text(p);
  const out: PowerKey[] = [];
  if (/(24\s*\/?\s*7|24h|24 hours?|24-hour)\s*(power|electricity|light)|constant (power|light)|uninterrupted (power|electricity)|steady power/.test(t + " " + words(p))) out.push("24h");
  if (t.includes("generator")) out.push("generator");
  if (t.includes("inverter")) out.push("inverter");
  if (t.includes("solar")) out.push("solar");
  return out;
};

export const hasWater = (p: Property) => /water|borehole|treatment/.test(text(p));

export const stayKind = (p: Property): KindKey | null => {
  const w = words(p);
  for (const k of ["penthouse", "duplex", "studio", "apartment", "house"] as KindKey[]) {
    if (w.includes(k) || (k === "apartment" && /\bflat\b/.test(w)) || (k === "house" && /terrace|bungalow|villa/.test(w))) return k;
  }
  return null;
};

export const applyFilters = (list: Property[], f: Filters): Property[] =>
  list.filter((p) => {
    if (f.minPrice != null && !(p.priceNum >= f.minPrice)) return false;
    if (f.maxPrice != null && !(p.priceNum > 0 && p.priceNum <= f.maxPrice)) return false;
    if (f.beds && (p.beds || 0) < f.beds) return false;
    if (f.kinds.length) { const k = stayKind(p); if (!k || !f.kinds.includes(k)) return false; }
    if (f.power.length) { const t = powerTags(p); if (!f.power.some((x) => t.includes(x))) return false; }
    if (f.water && !hasWater(p)) return false;
    if (f.verified && !p.verified) return false;
    if (f.rating4 && !(p.rating >= 4)) return false;
    return true;
  });

export const sortStays = (list: Property[], sort: SortKey): Property[] => {
  const a = [...list];
  const price = (p: Property) => (p.priceNum > 0 ? p.priceNum : Infinity);
  switch (sort) {
    case "price_asc": return a.sort((x, y) => price(x) - price(y));
    case "price_desc": return a.sort((x, y) => (y.priceNum || 0) - (x.priceNum || 0));
    case "rating": return a.sort((x, y) => y.rating - x.rating || y.reviews - x.reviews);
    case "newest": return a.sort((x, y) => (y.createdAt || "").localeCompare(x.createdAt || ""));
    default: return a;
  }
};

export const activeFilterCount = (f: Filters) =>
  (f.minPrice != null || f.maxPrice != null ? 1 : 0) + (f.beds ? 1 : 0) + f.kinds.length + f.power.length + (f.water ? 1 : 0) + (f.verified ? 1 : 0) + (f.rating4 ? 1 : 0);

const num = (v: string | null) => { if (v == null || v === "") return undefined; const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : undefined; };
const list = <T extends string>(v: string | null, allowed: readonly T[]) => (v ? v.split(",").filter((x): x is T => (allowed as readonly string[]).includes(x)) : []);

export const parseFilters = (p: URLSearchParams): Filters => {
  const sort = p.get("sort") as SortKey;
  return {
    sort: SORTS.some((s) => s.key === sort) ? sort : "recommended",
    minPrice: num(p.get("pmin")),
    maxPrice: num(p.get("pmax")),
    beds: num(p.get("fbeds")),
    kinds: list(p.get("kind"), KINDS.map((k) => k.key)),
    power: list(p.get("power"), POWER.map((k) => k.key)),
    water: p.get("water") === "1",
    verified: p.get("verified") === "1",
    rating4: p.get("r4") === "1",
  };
};

const addDays = (d: string, n: number) => { const t = new Date(d + "T00:00:00Z"); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };

/** Nearest check-in (within ±horizon days, closest first, never before today) where `nights` nights are free of the booked ranges (check-out exclusive). */
export const nearestFreeStart = (ranges: { check_in: string; check_out: string }[], checkIn: string, nights: number, today: string, horizon = 30): string | null => {
  const free = (start: string) => {
    const end = addDays(start, nights);
    return !ranges.some((r) => start < r.check_out && r.check_in < end);
  };
  for (let o = 1; o <= horizon; o++) {
    for (const s of [addDays(checkIn, o), addDays(checkIn, -o)]) if (s >= today && free(s)) return s;
  }
  return null;
};
export { addDays };

const KEYS = ["sort", "pmin", "pmax", "fbeds", "kind", "power", "water", "verified", "r4"];
/** Writes filters into a copy of the params, keeping the search (where/when/who) untouched. */
export const writeFilters = (base: URLSearchParams, f: Filters): URLSearchParams => {
  const p = new URLSearchParams(base);
  KEYS.forEach((k) => p.delete(k));
  if (f.sort !== "recommended") p.set("sort", f.sort);
  if (f.minPrice != null) p.set("pmin", String(f.minPrice));
  if (f.maxPrice != null) p.set("pmax", String(f.maxPrice));
  if (f.beds) p.set("fbeds", String(f.beds));
  if (f.kinds.length) p.set("kind", f.kinds.join(","));
  if (f.power.length) p.set("power", f.power.join(","));
  if (f.water) p.set("water", "1");
  if (f.verified) p.set("verified", "1");
  if (f.rating4) p.set("r4", "1");
  return p;
};
