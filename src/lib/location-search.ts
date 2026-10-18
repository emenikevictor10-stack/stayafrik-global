import type { Property } from "@/data/properties";
import { normalizeState, stateForCity } from "@/lib/nigeria-places";

/** Words that carry no location meaning in a search. */
const STOPWORDS = new Set(["nigeria", "state", "lga", "fct", "the", "in", "near", "city", "area", "of", "and"]);

const ALIASES: Record<string, string> = { vi: "victoria island", ph: "port harcourt", phc: "port harcourt" };

/** Known neighbourhoods → city, so "Lekki" also surfaces other Lagos stays. */
const AREA_CITY: Record<string, string> = {
  lekki: "Lagos", ikoyi: "Lagos", "victoria island": "Lagos", ikeja: "Lagos", maryland: "Lagos", ogudu: "Lagos",
  yaba: "Lagos", surulere: "Lagos", ajah: "Lagos", gbagada: "Lagos", magodo: "Lagos", oniru: "Lagos", ilupeju: "Lagos",
  maitama: "Abuja", wuse: "Abuja", asokoro: "Abuja", garki: "Abuja", gwarinpa: "Abuja", jabi: "Abuja", lifecamp: "Abuja",
  "life camp": "Abuja", katampe: "Abuja", utako: "Abuja", gra: "Port Harcourt", "trans amadi": "Port Harcourt",
  rumuola: "Port Harcourt", "old gra": "Port Harcourt",
};

const CITY_STATE: Record<string, string> = {
  lagos: "Lagos State", abuja: "FCT Abuja", "port harcourt": "Rivers State", enugu: "Enugu State", ibadan: "Oyo State",
  calabar: "Cross River State", "benin city": "Edo State", uyo: "Akwa Ibom State", owerri: "Imo State", kano: "Kano State",
};

const STATE_WORD_CITY: Record<string, string> = { rivers: "port harcourt", oyo: "ibadan", "cross river": "calabar", edo: "benin city", imo: "owerri", "akwa ibom": "uyo" };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
const title = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

/** "Lekki, Lagos, Nigeria" → ["lekki","lagos"]; keeps multi-word places like "victoria island". */
export const tokenize = (q: string): string[] => {
  const parts = q.split(",").map(norm).filter(Boolean);
  const out: string[] = [];
  for (const part of parts) {
    const p = ALIASES[part] || part;
    const words = p.split(" ").filter((w) => !STOPWORDS.has(w));
    if (!words.length) continue;
    const joined = words.map((w) => ALIASES[w] || w).join(" ");
    out.push(STATE_WORD_CITY[joined] || joined);
  }
  return Array.from(new Set(out));
};

const placeParts = (p: Property) => {
  if (p.neighborhood) {
    const city = (p.city || "").trim();
    const hood = p.neighborhood && norm(p.neighborhood) !== norm(city) ? p.neighborhood.trim() : "";
    return { hood, city };
  }
  const [hoodRaw = "", ...rest] = (p.location || "").split(",").map((s) => s.trim()).filter(Boolean);
  const city = (p.city || rest[rest.length - 1] || "").trim();
  const hood = norm(hoodRaw) === norm(city) ? "" : hoodRaw;
  return { hood, city };
};

/** Real state from the listing, else a guess from its city. */
const stateOf = (p: Property) => normalizeState(p.state) || stateForCity(p.city) || "";

/** City a token points at: the city itself or the city a known area belongs to. */
const cityOf = (t: string) => {
  if (CITY_STATE[t]) return t;
  const c = AREA_CITY[t];
  return c ? norm(c) : null;
};

/** 3 = area/title match, 2 = city match, 1 = same city via area lookup, 0 = no match. */
export const scoreProperty = (p: Property, tokens: string[]): number => {
  if (!tokens.length) return 1;
  const { hood, city } = placeParts(p);
  const h = norm(hood), c = norm(city), t = norm(p.title), loc = norm(p.location);
  let best = 0;
  for (const tok of tokens) {
    if ((h && (h.includes(tok) || tok.includes(h))) || t.includes(tok)) best = Math.max(best, 3);
    else if (c && (c === tok || loc.includes(tok))) best = Math.max(best, 2);
    else if (stateOf(p) && norm(stateOf(p)).split(" ").includes(tok)) best = Math.max(best, 2);
    else if (p.amenities.some((a) => norm(a.label).includes(tok))) best = Math.max(best, 2);
    else if (c && cityOf(tok) === c) best = Math.max(best, 1);
  }
  return best;
};

/** Filter + rank listings for a query. Falls back to same-city stays when no exact area hit. */
export const searchProperties = (list: Property[], q: string) => {
  const tokens = tokenize(q);
  if (!tokens.length) return { results: list, fallbackCity: null as string | null, exactCount: list.length };
  const scored = list.map((p) => ({ p, s: scoreProperty(p, tokens) })).filter((x) => x.s > 0);
  scored.sort((a, b) => b.s - a.s);
  const exactCount = scored.filter((x) => x.s >= 2).length;
  const fallbackCity = exactCount === 0 && scored.length ? title(tokens.map(cityOf).find(Boolean) || "") || null : null;
  return { results: scored.map((x) => x.p), fallbackCity, exactCount };
};

/** Cities with stays to offer when a search finds nothing, best first. */
export const rescueCities = (list: Property[], q: string, max = 3): string[] => {
  const tokens = tokenize(q);
  const idx = buildLocationIndex(list).filter((e) => e.kind === "city");
  const hinted = tokens.map(cityOf).find(Boolean);
  const sorted = idx.sort((a, b) => {
    const aHit = hinted && norm(a.name) === hinted ? 1 : 0;
    const bHit = hinted && norm(b.name) === hinted ? 1 : 0;
    return bHit - aHit || b.count - a.count;
  });
  return sorted.slice(0, max).map((e) => e.name);
};

export type LocationEntry = {
  kind: "area" | "city" | "state";
  name: string;
  city?: string;
  label: string;
  count: number;
  partner: boolean;
  local: boolean;
};

/** Every neighbourhood, city and state that has at least one stay, from partner and local listings. */
export const buildLocationIndex = (list: Property[]): LocationEntry[] => {
  const map = new Map<string, LocationEntry>();
  const add = (kind: LocationEntry["kind"], name: string, city: string | undefined, label: string, p: Property) => {
    const key = `${kind}|${norm(name)}|${norm(city || "")}`;
    const e = map.get(key) || { kind, name, city, label, count: 0, partner: false, local: false };
    e.count++;
    if (p.source === "rayprop") e.partner = true; else e.local = true;
    map.set(key, e);
  };
  for (const p of list) {
    if (p.type !== "Shortlet") continue;
    const { hood, city } = placeParts(p);
    const cityName = city ? title(norm(city)) : "";
    const st = stateOf(p);
    const stLabel = st ? (st === "FCT Abuja" ? st : `${st} State`) : "";
    if (hood) add("area", title(norm(hood)), cityName || undefined, cityName ? `${title(norm(hood))}, ${cityName}` : title(norm(hood)), p);
    if (cityName) add("city", cityName, st || undefined, cityName, p);
    if (stLabel) add("state", stLabel, undefined, stLabel, p);
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
};

/** Index entries matching what the guest typed (prefix/word match), best first. */
export const matchLocations = (index: LocationEntry[], q: string, max = 8): LocationEntry[] => {
  const n = norm(q);
  if (n.length < 2) return [];
  const rank = (e: LocationEntry) => {
    const l = norm(e.label);
    if (l.startsWith(n)) return 0;
    if (l.split(" ").some((w) => w.startsWith(n))) return 1;
    return l.includes(n) ? 2 : 9;
  };
  return index.map((e) => ({ e, r: rank(e) })).filter((x) => x.r < 9)
    .sort((a, b) => a.r - b.r || b.e.count - a.e.count).slice(0, max).map((x) => x.e);
};
