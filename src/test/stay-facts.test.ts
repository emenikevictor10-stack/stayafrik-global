import { describe, it, expect } from "vitest";
import { factualTitle, essentials, cancellationLines } from "@/lib/stay-facts";
import { approxPoint, shortPrice } from "@/lib/map-pins";
import type { Property } from "@/data/properties";

const mk = (o: Partial<Property>): Property => ({
  id: "x", title: "Luxury 2 bedroom apartment", location: "Lekki Phase 1, Lagos", type: "Shortlet", price: "", priceNum: 0, beds: 2, baths: 2, area: "",
  verified: true, agent: "", agentTag: "", agentEmoji: "", emoji: "", image: "", rating: 0, reviews: 0, desc: "", amenities: [], lat: 6.4, lng: 3.5, ...o,
});

describe("stay facts", () => {
  it("builds a factual title", () => expect(factualTitle(mk({ neighborhood: "Lekki Phase 1" }))).toBe("2-bed apartment in Lekki Phase 1"));
  it("studio has no bed count", () => expect(factualTitle(mk({ title: "Cozy studio", beds: 1, city: "Ikeja" }))).toBe("Studio in Ikeja"));
  it("reads power/water/security", () => {
    const e = essentials(mk({ amenities: [{ emoji: "", label: "Inverter" }, { emoji: "", label: "Borehole" }, { emoji: "", label: "24/7 Security" }] }));
    expect(e).toEqual({ power: "Inverter", water: "Borehole water", security: "Security guard" });
  });
  it("local cancellation = 48h full / 50% / none", () => expect(cancellationLines(mk({}))).toHaveLength(3));
});

describe("map pins", () => {
  it("offsets are stable and within ~1km", () => {
    const a = approxPoint("abc", 6.4, 3.5), b = approxPoint("abc", 6.4, 3.5);
    expect(a).toEqual(b);
    expect(Math.hypot(a[0] - 6.4, a[1] - 3.5)).toBeGreaterThan(0.002);
    expect(Math.hypot(a[0] - 6.4, a[1] - 3.5)).toBeLessThan(0.007);
  });
  it("short prices", () => { expect(shortPrice(85000)).toBe("₦85k"); expect(shortPrice(1200000)).toBe("₦1.2m"); expect(shortPrice(0)).toBe("—"); });
});
