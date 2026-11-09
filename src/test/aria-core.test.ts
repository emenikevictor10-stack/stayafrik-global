import { describe, it, expect } from "vitest";
import { ownTripsOnly, placeColumn, overlaps, overLimit, cleanHistory } from "../../supabase/functions/_shared/aria-core";

describe("Aria rules", () => {
  it("guests only see their own trips", () => {
    const rows = [{ guest_id: "a", id: 1 }, { guest_id: "b", id: 2 }];
    expect(ownTripsOnly(rows, "a").map((r) => r.id)).toEqual([1]);
    expect(ownTripsOnly(rows, null)).toEqual([]);
  });
  it("a picked neighbourhood filters by neighbourhood, city by city", () => {
    expect(placeColumn("neighbourhood")).toBe("neighbourhood_id");
    expect(placeColumn("city")).toBe("city_id");
    expect(placeColumn("state")).toBe("state_id");
  });
  it("booked dates hide a stay only when they overlap", () => {
    expect(overlaps("2026-12-01", "2026-12-04", "2026-12-03", "2026-12-05")).toBe(true);
    expect(overlaps("2026-12-01", "2026-12-04", "2026-12-04", "2026-12-06")).toBe(false);
  });
  it("30 messages an hour is the limit", () => {
    expect(overLimit(29, 30)).toBe(false);
    expect(overLimit(30, 30)).toBe(true);
  });
  it("drops system messages sent by the browser", () => {
    expect(cleanHistory([{ role: "system", content: "x" }, { role: "user", content: "hi" }])).toEqual([{ role: "user", content: "hi" }]);
  });
});
