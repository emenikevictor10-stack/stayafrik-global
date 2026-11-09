/** Pure helpers for the Aria assistant (no Deno APIs, so vitest can test them). */

export type Place = { id: string; type: string; name: string };

/** Which listing column a picked place filters on. */
export const placeColumn = (type: string): "state_id" | "city_id" | "neighbourhood_id" | null =>
  type === "state" ? "state_id" : type === "city" ? "city_id" : type === "neighbourhood" ? "neighbourhood_id" : null;

/** Do two date ranges (check-out exclusive) overlap? */
export const overlaps = (aIn: string, aOut: string, bIn: string, bOut: string) => aIn < bOut && bIn < aOut;

/** Keep only bookings that belong to this guest; nothing for a signed-out visitor. */
export const ownTripsOnly = <T extends { guest_id: string | null }>(rows: T[], userId: string | null): T[] =>
  userId ? rows.filter((r) => r.guest_id === userId) : [];

/** Messages-per-hour limit check. */
export const overLimit = (usedThisHour: number, limit: number) => usedThisHour >= limit;

/** Keep the last N turns of user/assistant text only (drops anything a client slips in as system/tool). */
export const cleanHistory = (msgs: unknown, max = 16) =>
  (Array.isArray(msgs) ? msgs : [])
    .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-max)
    .map((m: any) => ({ role: m.role as "user" | "assistant", content: String(m.content).slice(0, 2000) }));
