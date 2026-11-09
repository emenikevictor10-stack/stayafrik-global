import { describe, it, expect } from "vitest";
import { splitShares } from "../../supabase/functions/_shared/booking-core";

describe("split payments", () => {
  it("shares add up exactly to the total, remainder on the lead", () => {
    const s = splitShares(10_000_01, 3);
    expect(s).toEqual([333_335, 333_333, 333_333]);
    expect(s.reduce((a, b) => a + b, 0)).toBe(10_000_01);
  });
  it("refuses fewer than 2 or more than 8 people", () => {
    expect(() => splitShares(1000, 1)).toThrow();
    expect(() => splitShares(1000, 9)).toThrow();
  });
});
