import { describe, it, expect } from "vitest";
import { canMove, localSplit, nightlyBreakdown, expiresAt } from "../../supabase/functions/_shared/booking-core";

describe("booking lifecycle", () => {
  it("allows held → confirmed and held → expired", () => {
    expect(canMove("held", "confirmed")).toBe(true);
    expect(canMove("held", "expired")).toBe(true);
  });
  it("refuses jumping from held straight to released", () => {
    expect(canMove("held", "released")).toBe(false);
  });
  it("refuses reopening a refunded booking", () => {
    expect(canMove("refunded", "confirmed")).toBe(false);
  });
  it("accepts a late payment on an expired hold", () => {
    expect(canMove("expired", "confirmed")).toBe(true);
  });
});

describe("money split", () => {
  it("3 nights at ₦90,000 with 8% fee: guest pays ₦291,600, host gets ₦270,000", () => {
    const n = nightlyBreakdown("2026-12-01", "2026-12-04", 9_000_000);
    expect(n.map((x) => x.date)).toEqual(["2026-12-01", "2026-12-02", "2026-12-03"]);
    const s = localSplit(n, 800);
    expect(s.total_kobo).toBe(29_160_000);
    expect(s.fee_kobo).toBe(2_160_000);
    expect(s.host_payout_kobo).toBe(27_000_000);
  });
  it("uses the fee setting, e.g. 10%", () => {
    expect(localSplit(nightlyBreakdown("2026-12-01", "2026-12-02", 10_000_000), 1000).fee_kobo).toBe(1_000_000);
  });
});

describe("hold timing", () => {
  it("a 15-minute hold ends 15 minutes later", () => {
    const t = new Date("2026-11-08T22:00:00Z");
    expect(expiresAt(t, 15).toISOString()).toBe("2026-11-08T22:15:00.000Z");
  });
});
