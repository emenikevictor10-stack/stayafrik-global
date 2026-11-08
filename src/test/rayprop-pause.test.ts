import { describe, it, expect } from "vitest";
import { isPauseError, isPaused, catalogueRefreshDue } from "../../supabase/functions/_shared/rayprop-core";

const NOW = Date.parse("2026-11-08T22:00:00Z");
const iso = (ms: number) => new Date(NOW + ms).toISOString();

describe("RayProp pause rule", () => {
  it("pauses on a blocked key", () => expect(isPauseError(403, "API_KEY_BLOCKED")).toBe(true));
  it("pauses on rate limit", () => expect(isPauseError(429, "")).toBe(true));
  it("does not pause on date conflict", () => expect(isPauseError(409, "CONFLICT")).toBe(false));
  it("is paused before blocked_until", () => expect(isPaused(iso(60_000), NOW)).toBe(true));
  it("is not paused after blocked_until", () => expect(isPaused(iso(-1), NOW)).toBe(false));
});

describe("Catalogue refresh timing (6 hours)", () => {
  it("refreshes when never loaded", () => expect(catalogueRefreshDue(null, null, NOW)).toBe(true));
  it("does not refresh at 5h59m", () => expect(catalogueRefreshDue(iso(-(6 * 3600_000 - 60_000)), null, NOW)).toBe(false));
  it("refreshes at 6h", () => expect(catalogueRefreshDue(iso(-6 * 3600_000), null, NOW)).toBe(true));
  it("never refreshes while paused", () => expect(catalogueRefreshDue(null, iso(60_000), NOW)).toBe(false));
});
