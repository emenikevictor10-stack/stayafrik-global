import { describe, it, expect } from "vitest";
import { splitShares, validateCustomShares, shareReminderDue } from "../../supabase/functions/_shared/booking-core";

describe("split payments", () => {
  it("shares add up exactly to the total, remainder on the lead", () => {
    const s = splitShares(10_000_01, 3);
    expect(s).toEqual([333_335, 333_333, 333_333]);
    expect(s.reduce((a, b) => a + b, 0)).toBe(10_000_01);
  });
  it("refuses fewer than 2 or more than 6 people", () => {
    expect(() => splitShares(1000, 1)).toThrow();
    expect(() => splitShares(1000, 7)).toThrow();
  });
  it("allows exactly 6 people", () => {
    expect(splitShares(600_000, 6)).toHaveLength(6);
  });
  it("custom amounts must add up exactly to the total", () => {
    expect(validateCustomShares(500_000, [{ amount_kobo: 300_000 }, { amount_kobo: 200_000 }])).toBeNull();
    expect(validateCustomShares(500_000, [{ amount_kobo: 300_000 }, { amount_kobo: 199_999 }])).toBe("The shares must add up to the total");
  });
  it("custom shares need 2–6 people and at least ₦1,000 each", () => {
    expect(validateCustomShares(700_000, Array(7).fill({ amount_kobo: 100_000 }))).toBe("Split between 2 and 6 people");
    expect(validateCustomShares(200_000, [{ amount_kobo: 199_000 }, { amount_kobo: 1_000 }])).toBe("Each share must be at least ₦1,000");
  });
  it("reminders: first after 1 hour, then every 12 hours, plus once in the last 2 hours", () => {
    const H = 3_600_000, t0 = new Date("2026-11-09T10:00:00Z"), at = (h: number) => new Date(t0.getTime() + h * H);
    const end = at(24);
    expect(shareReminderDue(at(0.5), t0, null, end)).toBe(false);
    expect(shareReminderDue(at(1.5), t0, null, end)).toBe(true);
    expect(shareReminderDue(at(10), t0, at(2), end)).toBe(false);
    expect(shareReminderDue(at(14.5), t0, at(2), end)).toBe(true);
    expect(shareReminderDue(at(22.5), t0, at(15), end)).toBe(true);
    expect(shareReminderDue(at(23), t0, at(22.5), end)).toBe(false);
    expect(shareReminderDue(at(25), t0, at(2), end)).toBe(false);
  });
});
