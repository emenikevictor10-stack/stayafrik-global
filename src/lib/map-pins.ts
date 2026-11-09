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
