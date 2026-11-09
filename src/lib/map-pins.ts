/** Stable pseudo-random offset per stay so pins show the area, never the exact building. ~300–700 m. */
export const approxPoint = (id: string, lat: number, lng: number): [number, number] => {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  const a = ((h >>> 0) % 360) * (Math.PI / 180);
  const r = 0.003 + (((h >>> 9) % 1000) / 1000) * 0.0035; // degrees
  return [lat + r * Math.sin(a), lng + r * Math.cos(a)];
};

/** "₦85k", "₦1.2m" for map pins. */
export const shortPrice = (n: number) => {
  if (!n || n <= 0) return "—";
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}m`;
  if (n >= 1000) return `₦${Math.round(n / 1000)}k`;
  return `₦${n}`;
};

/** Radius (metres) of the area circle drawn for a picked stay. Covers the max pin offset (~700 m) so the real spot is always inside. */
export const AREA_CIRCLE_M = 800;
/** Wider circle for stays placed only by their neighbourhood/city point. */
export const AREA_ONLY_CIRCLE_M = 2000;

/** The old "central Lagos" starting point that new listings saved when the host never moved the pin. Not a real location. */
export const DEFAULT_POINT = { lat: 6.5244, lng: 3.3792 };
export const isDefaultPoint = (lat?: number | null, lng?: number | null) =>
  typeof lat === "number" && typeof lng === "number" && Math.abs(lat - DEFAULT_POINT.lat) < 0.0006 && Math.abs(lng - DEFAULT_POINT.lng) < 0.0006;

/** Has a usable map location (not missing, not 0,0, not the old default spot). */
export const hasCoords = (p: { lat?: number | null; lng?: number | null }) =>
  typeof p.lat === "number" && typeof p.lng === "number" && !(p.lat === 0 && p.lng === 0) && Number.isFinite(p.lat) && Number.isFinite(p.lng)
  && !isDefaultPoint(p.lat, p.lng);

export type AreaPoint = { lat: number; lng: number; level?: string };
export type Pin = { point: [number, number]; kind: "exact" | "area" };

/** Where a stay's pin goes: its own (scattered) point, else its neighbourhood/city point, else nowhere. */
export const pinFor = (p: { id: string; lat?: number | null; lng?: number | null }, areas: Record<string, AreaPoint | undefined>): Pin | null => {
  if (hasCoords(p)) return { point: approxPoint(p.id, p.lat!, p.lng!), kind: "exact" };
  const a = areas[p.id];
  if (a && Number.isFinite(a.lat) && Number.isFinite(a.lng)) return { point: approxPoint(p.id, a.lat, a.lng), kind: "area" };
  return null;
};

/** Drop far-away strays when framing the map: keep points within `km` of the median point (falls back to all). */
export const trimOutliers = (pts: [number, number][], km = 60): [number, number][] => {
  if (pts.length < 5) return pts;
  const med = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
  const c = [med(pts.map((p) => p[0])), med(pts.map((p) => p[1]))];
  const kept = pts.filter((p) => Math.hypot((p[0] - c[0]) * 111, (p[1] - c[1]) * 111 * Math.cos((c[0] * Math.PI) / 180)) <= km);
  return kept.length ? kept : pts;
};

/** Groups of stays whose saved locations are within ~`metres` of each other (likely copied/default coordinates). Groups of 3+ only. */
export const sharedLocations = <T extends { id: string; lat?: number | null; lng?: number | null }>(items: T[], metres = 30, minSize = 3): T[][] => {
  const cell = metres / 111_000; // degrees
  const groups = new Map<string, T[]>();
  items.filter((p) => typeof p.lat === "number" && typeof p.lng === "number" && !(p.lat === 0 && p.lng === 0)).forEach((p) => {
    const k = `${Math.round(p.lat! / cell)}:${Math.round(p.lng! / cell)}`;
    groups.set(k, [...(groups.get(k) || []), p]);
  });
  return [...groups.values()].filter((g) => g.length >= minSize).sort((a, b) => b.length - a.length);
};

/** What the stay page map may show: approximate centre + area circle before payment, exact point after. */
export const areaView = (id: string, lat: number, lng: number, approximate: boolean): { center: [number, number]; radius: number } =>
  approximate ? { center: approxPoint(id, lat, lng), radius: AREA_CIRCLE_M } : { center: [lat, lng], radius: 0 };
