import { describe, it, expect } from "vitest";
import { applyFilters, sortStays, emptyFilters, parseFilters, writeFilters, nearestFreeStart, powerTags, PAGE_SIZE } from "@/lib/results";
import type { Property } from "@/data/properties";

const mk = (o: Partial<Property>): Property => ({
  id: o.id || "x", title: "Stay", location: "Lekki, Lagos", type: "Shortlet", price: "", priceNum: 50000, beds: 1, baths: 1, area: "",
  verified: false, agent: "", agentTag: "", agentEmoji: "", emoji: "", image: "", rating: 0, reviews: 0, desc: "", amenities: [], lat: 0, lng: 0, ...o,
});
const am = (...l: string[]) => l.map((label) => ({ emoji: "", label }));

const a = mk({ id: "a", priceNum: 30000, rating: 4.6, verified: true, amenities: am("Generator", "Borehole water"), createdAt: "2026-01-01", title: "Studio in Lekki" });
const b = mk({ id: "b", priceNum: 90000, rating: 3.8, beds: 3, amenities: am("Solar power"), createdAt: "2026-03-01", title: "3-bed duplex" });
const c = mk({ id: "c", priceNum: 0, rating: 4.1, amenities: am("Inverter", "24/7 power"), createdAt: "2026-02-01", title: "Apartment" });
const all = [a, b, c];
const f = (o: Partial<ReturnType<typeof emptyFilters>>) => ({ ...emptyFilters(), ...o });
const ids = (l: Property[]) => l.map((p) => p.id);

describe("results filters", () => {
  it("price range per night", () => expect(ids(applyFilters(all, f({ minPrice: 40000, maxPrice: 100000 })))).toEqual(["b"]));
  it("max price excludes stays without a price", () => expect(ids(applyFilters(all, f({ maxPrice: 100000 })))).toEqual(["a", "b"]));
  it("bedrooms minimum", () => expect(ids(applyFilters(all, f({ beds: 3 })))).toEqual(["b"]));
  it("property type", () => expect(ids(applyFilters(all, f({ kinds: ["studio", "duplex"] })))).toEqual(["a", "b"]));
  it("power: any picked kind matches", () => expect(ids(applyFilters(all, f({ power: ["solar", "inverter"] })))).toEqual(["b", "c"]));
  it("24h power detected", () => expect(powerTags(c)).toContain("24h"));
  it("water", () => expect(ids(applyFilters(all, f({ water: true })))).toEqual(["a"]));
  it("verified only", () => expect(ids(applyFilters(all, f({ verified: true })))).toEqual(["a"]));
  it("rating 4+", () => expect(ids(applyFilters(all, f({ rating4: true })))).toEqual(["a", "c"]));
});

describe("results sort", () => {
  it("price low to high puts unpriced last", () => expect(ids(sortStays(all, "price_asc"))).toEqual(["a", "b", "c"]));
  it("price high to low", () => expect(ids(sortStays(all, "price_desc"))).toEqual(["b", "a", "c"]));
  it("rating", () => expect(ids(sortStays(all, "rating"))).toEqual(["a", "c", "b"]));
  it("newest", () => expect(ids(sortStays(all, "newest"))).toEqual(["b", "c", "a"]));
  it("recommended keeps order", () => expect(ids(sortStays(all, "recommended"))).toEqual(["a", "b", "c"]));
});

describe("results link + paging", () => {
  it("round-trips filters and keeps search params", () => {
    const v = f({ sort: "rating", minPrice: 10, power: ["solar"], water: true, rating4: true, beds: 2 });
    const p = writeFilters(new URLSearchParams("where=Lekki"), v);
    expect(p.get("where")).toBe("Lekki");
    expect(parseFilters(p)).toEqual(v);
  });
  it("12 per page", () => expect(PAGE_SIZE).toBe(12));
  it("nearest free dates skip booked nights", () => {
    const r = [{ check_in: "2026-12-10", check_out: "2026-12-15" }];
    expect(nearestFreeStart(r, "2026-12-12", 2, "2026-12-01")).toBe("2026-12-15");
    const long = [{ check_in: "2026-12-10", check_out: "2026-12-20" }];
    expect(nearestFreeStart(long, "2026-12-12", 2, "2026-12-01")).toBe("2026-12-08");
    expect(nearestFreeStart(long, "2026-12-12", 2, "2026-12-11")).toBe("2026-12-20");
  });
});
