import { describe, it, expect } from "vitest";
import { parseSearch, serializeSearch, nightsOf, totalPrice, fitsGuests, overlapsBlocked, EMPTY_SEARCH } from "@/lib/search-state";

describe("search state", () => {
  it("round-trips through the web address", () => {
    const s = { where: "Lekki", checkIn: "2026-11-12", checkOut: "2026-11-15", flex: 1 as const, adults: 2, children: 1, infants: 0 };
    expect(parseSearch(serializeSearch(s))).toEqual(s);
  });
  it("drops dates when check-out is not after check-in", () => {
    const s = parseSearch(new URLSearchParams("in=2026-11-15&out=2026-11-12"));
    expect(s.checkIn).toBeUndefined();
  });
  it("total = nights × nightly price", () => {
    const s = { ...EMPTY_SEARCH, checkIn: "2026-11-12", checkOut: "2026-11-15" };
    expect(nightsOf(s)).toBe(3);
    expect(totalPrice(50000, nightsOf(s))).toBe(150000);
  });
  it("hides stays too small for the party", () => {
    expect(fitsGuests({ beds: 1 }, 3)).toBe(false);
    expect(fitsGuests({ beds: 2 }, 4)).toBe(true);
    expect(fitsGuests({ beds: 3, maxGuests: 2 }, 3)).toBe(false);
  });
  it("hides stays booked on the chosen dates", () => {
    const blocked = new Set(["2026-11-13"]);
    expect(overlapsBlocked(blocked, "2026-11-12", "2026-11-15")).toBe(true);
    expect(overlapsBlocked(blocked, "2026-11-14", "2026-11-16")).toBe(false);
    expect(overlapsBlocked(blocked, "2026-11-10", "2026-11-13")).toBe(false); // checkout day free
  });
});
