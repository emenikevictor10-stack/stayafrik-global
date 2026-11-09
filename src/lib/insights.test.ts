import { describe, expect, it } from "vitest";
import { changeText, lagosToday, periodRange, previousRange, share } from "./insights";

// 23:30 UTC on 31 Dec 2026 is already 1 Jan 2027 in Lagos.
const lateNye = new Date("2026-12-31T23:30:00Z");
const mid = new Date("2026-11-09T12:00:00Z");

describe("Insights periods (Lagos time)", () => {
  it("uses Lagos date, not UTC", () => expect(lagosToday(lateNye)).toBe("2027-01-01"));
  it("7 days ends today and includes 7 days", () => expect(periodRange("7", mid)).toEqual({ from: "2026-11-03", to: "2026-11-09" }));
  it("this month starts on the 1st", () => expect(periodRange("month", mid)).toEqual({ from: "2026-11-01", to: "2026-11-09" }));
  it("this year starts on 1 January in Lagos", () => expect(periodRange("year", lateNye)).toEqual({ from: "2027-01-01", to: "2027-01-01" }));
  it("custom needs from on or before to", () => {
    expect(periodRange("custom", mid, { from: "2026-10-05", to: "2026-10-01" })).toBeNull();
    expect(periodRange("custom", mid, { from: "2026-10-01", to: "2026-10-05" })).toEqual({ from: "2026-10-01", to: "2026-10-05" });
  });
  it("period before is the same length, ending the day before", () =>
    expect(previousRange({ from: "2026-11-03", to: "2026-11-09" })).toEqual({ from: "2026-10-27", to: "2026-11-02" }));
});

describe("change vs before", () => {
  it("rises and falls in percent", () => { expect(changeText(125, 100)).toBe("+25%"); expect(changeText(90, 100)).toBe("-10%"); });
  it("from zero is new, both zero is a dash", () => { expect(changeText(5, 0)).toBe("new"); expect(changeText(0, 0)).toBe("—"); });
  it("funnel share of started", () => expect(share(3, 12)).toBe(25));
});
