import { describe, it, expect } from "vitest";
import { tokenize, searchProperties, buildLocationIndex, matchLocations, rescueCities } from "@/lib/location-search";
import type { Property } from "@/data/properties";

const mk = (id: string, location: string, city: string, source: "rayprop" | "stayglobal" = "rayprop") =>
  ({ id, title: "Apartment", location, city, type: "Shortlet", amenities: [], source } as unknown as Property);

const list = [mk("a", "Lekki, Lagos", "Lagos"), mk("b", "Maryland, Lagos", "Lagos"), mk("c", "Lifecamp, Abuja", "Abuja", "stayglobal")];

describe("location search", () => {
  it("drops filler words from a full address", () => {
    expect(tokenize("Lekki, Lagos, Nigeria")).toEqual(["lekki", "lagos"]);
  });
  it("full Google address finds the Lekki stay first, then other Lagos stays", () => {
    const ids = searchProperties(list, "Lekki, Lagos, Nigeria").results.map((p) => p.id);
    expect(ids).toEqual(["a", "b"]);
  });
  it("Enugu does not match Lagos stays", () => {
    expect(searchProperties(list, "Enugu").results).toHaveLength(0);
  });
  it("an unknown Lagos area falls back to Lagos stays", () => {
    const r = searchProperties(list, "Ikoyi");
    expect(r.fallbackCity).toBe("Lagos");
    expect(r.results.map((p) => p.id).sort()).toEqual(["a", "b"]);
  });
  it("index merges partner and local places with counts", () => {
    const idx = buildLocationIndex(list);
    const lagos = idx.find((e) => e.kind === "city" && e.name === "Lagos")!;
    expect(lagos.count).toBe(2);
    expect(lagos.partner).toBe(true);
    expect(idx.find((e) => e.name === "Lifecamp")!.local).toBe(true);
    expect(matchLocations(idx, "mary")[0].label).toBe("Maryland, Lagos");
  });
});
