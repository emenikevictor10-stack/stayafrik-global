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
  it("rescueCities suggests the hinted city first when a search finds nothing", () => {
    expect(rescueCities(list, "Ikoyi")[0]).toBe("Lagos");
  });
  it("rescueCities falls back to the busiest cities for unknown places", () => {
    const cities = rescueCities(list, "Nowhereville");
    expect(cities).toContain("Lagos");
    expect(cities.length).toBeLessThanOrEqual(3);
  });
  it("rescueCities returns nothing when there are no stays", () => {
    expect(rescueCities([], "Lekki")).toEqual([]);
  });
});

import { normalizeState, stateForCity } from "@/lib/nigeria-places";
describe("state / city / neighbourhood", () => {
  const rp = (id: string, city: string, state: string, neighborhood = "") =>
    ({ id, title: "Apt", location: [neighborhood, city].filter(Boolean).join(", "), city, state, neighborhood, type: "Shortlet", amenities: [], source: "rayprop" } as unknown as Property);
  const stays = [rp("1", "Lekki", "Lagos", "Chevron"), rp("2", "Magodo", "Lagos", "Magodo GRA"), rp("3", "Abuja", "FCT")];
  it("normalises FCT spellings", () => {
    expect(normalizeState("fct")).toBe("FCT Abuja");
    expect(normalizeState("Federal Capital Territory")).toBe("FCT Abuja");
    expect(normalizeState("lagos state")).toBe("Lagos");
  });
  it("links Lekki to Lagos State", () => {
    expect(stateForCity("Lekki")).toBe("Lagos");
    const idx = buildLocationIndex(stays);
    expect(idx.find((e) => e.kind === "city" && e.name === "Lekki")?.city).toBe("Lagos");
    expect(idx.find((e) => e.kind === "state" && e.name === "Lagos State")?.count).toBe(2);
  });
  it("picking a state includes all its cities", () => {
    expect(searchProperties(stays, "Lagos State").results.map((p) => p.id).sort()).toEqual(["1", "2"]);
  });
  it("picking a neighbourhood ranks it first", () => {
    expect(searchProperties(stays, "Chevron, Lekki").results[0].id).toBe("1");
  });
});
