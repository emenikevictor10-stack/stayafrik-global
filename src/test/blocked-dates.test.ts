import { describe, it, expect } from "vitest";
import { rangesToBlockedSet, isBlocked, rangeHitsBlocked, nextBlockedAfter } from "@/lib/blocked-dates";

const D = (s: string) => new Date(s + "T00:00:00");

describe("blocked dates", () => {
  // A booking of Nov 20 → Nov 23 blocks the nights of 20, 21, 22 — check-out day (23) stays free.
  const blocked = rangesToBlockedSet([{ check_in: "2026-11-20", check_out: "2026-11-23" }]);

  it("blocks each night of a booking but not the check-out day", () => {
    expect(isBlocked(blocked, D("2026-11-20"))).toBe(true);
    expect(isBlocked(blocked, D("2026-11-22"))).toBe(true);
    expect(isBlocked(blocked, D("2026-11-23"))).toBe(false);
    expect(isBlocked(blocked, D("2026-11-19"))).toBe(false);
  });

  it("detects a range that spans a blocked night", () => {
    expect(rangeHitsBlocked(blocked, D("2026-11-19"), D("2026-11-21"))).toBe(true);
    expect(rangeHitsBlocked(blocked, D("2026-11-23"), D("2026-11-26"))).toBe(false);
    // Back-to-back stays are allowed: checking in on someone's check-out day.
    expect(rangeHitsBlocked(blocked, D("2026-11-18"), D("2026-11-20"))).toBe(false);
  });

  it("finds the next blocked day after a date", () => {
    expect(nextBlockedAfter(blocked, D("2026-11-18"))?.toISOString().slice(0, 10)).toBe("2026-11-20");
    expect(nextBlockedAfter(blocked, D("2026-11-23"))).toBeNull();
  });

  it("ignores invalid or empty ranges", () => {
    const bad = rangesToBlockedSet([
      { check_in: "not-a-date", check_out: "2026-11-23" },
      { check_in: "2026-11-23", check_out: "2026-11-20" },
    ]);
    expect(bad.size).toBe(0);
  });
});
