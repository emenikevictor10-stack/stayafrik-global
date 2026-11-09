/** Pure helpers for Admin → Insights (periods in Lagos time, change-vs-before maths). */
export type PeriodKey = "7" | "30" | "90" | "month" | "year" | "custom";

/** Today's date in Lagos (UTC+1, no daylight saving) as YYYY-MM-DD. */
export const lagosToday = (now: Date = new Date()): string =>
  new Date(now.getTime() + 60 * 60 * 1000).toISOString().slice(0, 10);

const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** From/to (inclusive) for a period tab. Custom needs both dates, from ≤ to. */
export const periodRange = (key: PeriodKey, now: Date = new Date(), custom?: { from: string; to: string }): { from: string; to: string } | null => {
  const today = lagosToday(now);
  if (key === "7" || key === "30" || key === "90") return { from: addDays(today, -(Number(key) - 1)), to: today };
  if (key === "month") return { from: today.slice(0, 8) + "01", to: today };
  if (key === "year") return { from: today.slice(0, 5) + "01-01", to: today };
  if (!custom?.from || !custom?.to || custom.from > custom.to) return null;
  return custom;
};

/** The equally long period just before. */
export const previousRange = (r: { from: string; to: string }) => {
  const len = Math.round((Date.parse(r.to) - Date.parse(r.from)) / 864e5) + 1;
  return { from: addDays(r.from, -len), to: addDays(r.from, -1) };
};

/** Change vs before as text: "+25%", "-10%", "new" (was 0), "—" (both 0). */
export const changeText = (now: number, before: number): string => {
  if (!before) return now ? "new" : "—";
  const p = Math.round(((now - before) / before) * 100);
  return `${p >= 0 ? "+" : ""}${p}%`;
};

export const share = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);
