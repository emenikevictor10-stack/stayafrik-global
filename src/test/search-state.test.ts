import { describe, it, expect } from "vitest";
import {
  parseSearch, serializeSearch, nightsOf, totalPrice, fitsGuests, overlapsBlocked, EMPTY_SEARCH,
  applyGuests, minAdults, whenSummary, whoSummary, anyWindowFree, type SearchState,
} from "@/lib/search-state";

const S = (p: Partial<SearchState>): SearchState => ({ ...EMPTY_SEARCH, ...p });

describe("search state", () => {
  it("round-trips dates search through the web address", () => {
    const s = S({ where: "Lekki", checkIn: "2026-11-12", checkOut: "2026-11-15", flex: 2, adults: 2, children: 1, pets: 1 });
    expect(parseSearch(serializeSearch(s))).toEqual(s);
  });
  it("round-trips flexible search", () => {
    const s = S({ where: "Abuja", mode: "flexible", stayLength: "weekend", months: ["2026-11", "2026-12"], adults: 1 });
    expect(parseSearch(serializeSearch(s))).toEqual(s);
  });
  it("drops dates when check-out is not after check-in", () => {
    expect(parseSearch(new URLSearchParams("in=2026-11-15&out=2026-11-12")).checkIn).toBeUndefined();
  });
  it("total = nights × nightly price", () => {
    const s = S({ checkIn: "2026-11-12", checkOut: "2026-11-15" });
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
    expect(overlapsBlocked(blocked, "2026-11-10", "2026-11-13")).toBe(false);
  });
  it("±days keeps a stay if a shifted window is free", () => {
    const blocked = new Set(["2030-11-12"]);
    expect(anyWindowFree(blocked, "2030-11-12", "2030-11-14", 0)).toBe(false);
    expect(anyWindowFree(blocked, "2030-11-12", "2030-11-14", 1)).toBe(true);
  });
});

describe("guest rules", () => {
  const zero = { adults: 0, children: 0, infants: 0, pets: 0 };
  it("adding a child, infant or pet sets 1 adult", () => {
    expect(applyGuests(zero, { children: 1 }).adults).toBe(1);
    expect(applyGuests(zero, { infants: 1 }).adults).toBe(1);
    expect(applyGuests(zero, { pets: 1 }).adults).toBe(1);
  });
  it("adults can't drop below 1 while others are coming", () => {
    expect(minAdults({ ...zero, adults: 1, children: 1 })).toBe(1);
    expect(applyGuests({ ...zero, adults: 1, pets: 1 }, { adults: 0 }).adults).toBe(1);
  });
  it("caps guests at 16, infants and pets at 5", () => {
    expect(applyGuests({ ...zero, adults: 10 }, { children: 10 }).children).toBe(6);
    expect(applyGuests(zero, { infants: 9 }).infants).toBe(5);
    expect(applyGuests(zero, { pets: 9 }).pets).toBe(5);
  });
});

describe("summaries", () => {
  it("dates with flex", () => {
    expect(whenSummary(S({ checkIn: "2026-11-08", checkOut: "2026-11-19", flex: 2 }))).toBe("8–19 Nov ±2");
  });
  it("flexible months", () => {
    expect(whenSummary(S({ mode: "flexible", months: ["2026-11", "2026-12"] }))).toBe("Week in Nov, Dec");
    expect(whenSummary(S({ mode: "flexible", months: ["2026-11"] }))).toBe("Week in November");
    expect(whenSummary(S({ mode: "flexible" }))).toBe("Anytime");
  });
  it("who", () => {
    expect(whoSummary({ adults: 1, children: 1, infants: 1, pets: 1 })).toBe("2 guests, 1 infant, 1 pet");
    expect(whoSummary({ adults: 0, children: 0, infants: 0, pets: 0 })).toBe("");
  });
});

describe("place + bedrooms in the link", () => {
  it("reads loc, loc_type, checkin/checkout and bedrooms", () => {
    const s = parseSearch(new URLSearchParams("loc=chevron-lekki&loc_type=neighbourhood&where=Chevron&checkin=2026-11-08&checkout=2026-11-19&adults=2&children=1&bedrooms=2"));
    expect([s.loc, s.locType, s.checkIn, s.checkOut, s.bedrooms, s.adults, s.children]).toEqual(["chevron-lekki", "neighbourhood", "2026-11-08", "2026-11-19", 2, 2, 1]);
  });
  it("still reads old in/out links", () => {
    expect(parseSearch(new URLSearchParams("in=2026-11-08&out=2026-11-12")).checkOut).toBe("2026-11-12");
  });
  it("writes the brief's names and round-trips", () => {
    const s = parseSearch(new URLSearchParams("loc=lekki&loc_type=city&where=Lekki&checkin=2026-11-08&checkout=2026-11-10&bedrooms=3"));
    const p = serializeSearch(s);
    expect([p.get("loc"), p.get("loc_type"), p.get("checkin"), p.get("bedrooms")]).toEqual(["lekki", "city", "2026-11-08", "3"]);
  });
  it("ignores a malformed place slug", () => expect(parseSearch(new URLSearchParams("loc=<script>")).loc).toBeUndefined());
  it("summarises bedrooms", () => expect(whoSummary({ adults: 2, children: 0, infants: 1, pets: 0, bedrooms: 2 })).toBe("2 guests, 1 infant, 2+ bedrooms"));
});
