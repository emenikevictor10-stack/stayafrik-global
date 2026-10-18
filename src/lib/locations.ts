/** Master place list helpers (State → City → Neighbourhood). Pure — tested in locations.test.ts. */
export type LocationType = "state" | "city" | "neighbourhood";
export type Location = {
  id: string; name: string; slug: string; type: LocationType; parent_id: string | null;
  aliases: string[]; listing_count: number;
};

export const locNorm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** "Chevron" → "Lekki, Lagos" (everything above the place). */
export const breadcrumb = (loc: Location, byId: Map<string, Location>): string => {
  const parts: string[] = [];
  let p = loc.parent_id ? byId.get(loc.parent_id) : undefined;
  while (p) { parts.push(p.name); p = p.parent_id ? byId.get(p.parent_id) : undefined; }
  return parts.join(", ");
};

/** Walk up from a place and fill state/city/neighbourhood (picking Chevron also gives Lekki + Lagos). */
export const chainOf = (id: string | null | undefined, byId: Map<string, Location>) => {
  const out: { state?: Location; city?: Location; neighbourhood?: Location } = {};
  let cur = id ? byId.get(id) : undefined;
  while (cur) {
    out[cur.type] = cur;
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
  }
  return out;
};

/** Search-as-you-type over names + alternative spellings; exact > starts-with > word starts-with > alias. */
export const filterLocations = (all: Location[], q: string, opts: { types?: LocationType[]; parentId?: string | null; limit?: number } = {}) => {
  const n = locNorm(q);
  const pool = all.filter((l) => (!opts.types || opts.types.includes(l.type)) && (opts.parentId === undefined || l.parent_id === opts.parentId));
  if (!n) return pool.slice().sort((a, b) => b.listing_count - a.listing_count || a.name.localeCompare(b.name)).slice(0, opts.limit ?? 50);
  const score = (l: Location) => {
    const name = locNorm(l.name);
    if (name === n) return 5;
    if (name.startsWith(n)) return 4;
    if (name.split(" ").some((w) => w.startsWith(n))) return 3;
    if (l.aliases.some((a) => locNorm(a) === n || locNorm(a).startsWith(n))) return 2;
    return 0;
  };
  return pool
    .map((l) => ({ l, s: score(l) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || b.l.listing_count - a.l.listing_count || a.l.name.localeCompare(b.l.name))
    .slice(0, opts.limit ?? 50)
    .map((x) => x.l);
};
