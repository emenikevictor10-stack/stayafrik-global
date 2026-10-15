import { describe, it, expect } from "vitest";
import { raypropMatches } from "../../supabase/functions/_shared/rayprop-core";
import { prettyAmenity, raypropToProperty } from "../lib/rayprop-map";

describe("RayProp catalogue search", () => {
  it("'abuja' matches stays whose state is FCT or F.C.T", () => {
    expect(raypropMatches({ city: "Gwarimpa", state: "F.C.T" }, "abuja")).toBe(true);
    expect(raypropMatches({ city: "Abuja", state: "FCT" }, "Abuja, Nigeria")).toBe(true);
  });
  it("'abuja' does not match Lagos stays", () => {
    expect(raypropMatches({ city: "Lekki", state: "Lagos" }, "abuja")).toBe(false);
  });
  it("matches by neighbourhood", () => {
    expect(raypropMatches({ city: "Lagos", state: "Lagos", neighborhood: "Maryland" }, "maryland")).toBe(true);
  });
});

describe("RayProp amenity mapping", () => {
  it("prettifies slugs and applies aliases", () => {
    expect(prettyAmenity("backup_generator")).toBe("Backup generator");
    expect(prettyAmenity("en_suite_bedrooms")).toBe("En-suite bedrooms");
    expect(prettyAmenity("wifi")).toBe("Wi-Fi");
    expect(prettyAmenity("ps5")).toBe("PS5");
    expect(prettyAmenity("dstv")).toBe("DStv");
    expect(prettyAmenity("24/7 electricity")).toBe("24/7 electricity");
    expect(prettyAmenity("bbq_grill")).toBe("BBQ grill");
  });

  it("dedupes amenity variants", () => {
    const p = raypropToProperty(
      { id: "A1", amenities: ["streaming", "streaming services", "smart tv", "smart tvs", "tastefully_furnished", "tastefully furnished"] },
      "fallback.jpg",
    );
    expect(p!.amenities.map((a) => a.label)).toEqual(["Streaming", "Smart TV", "Tastefully furnished"]);
  });

  it("derives amenities from structured boolean fields", () => {
    const p = raypropToProperty(
      { id: "A2", has_parking: true, parking_spaces: 3, has_elevator: true, allows_children: true, allows_pets: "true", suitable_for_events: false },
      "fallback.jpg",
    );
    const labels = p!.amenities.map((a) => a.label);
    expect(labels).toContain("3 parking spaces");
    expect(labels).toContain("Elevator");
    expect(labels).toContain("Family friendly");
    expect(labels).toContain("Pets allowed");
    expect(labels).not.toContain("Events allowed");
  });

  it("maps a real partner-shaped row so the smart filters can match it", () => {
    const p = raypropToProperty(
      { id: "A3", amenities: ["backup_generator", "wifi"], has_parking: true, allows_children: true },
      "fallback.jpg",
    );
    const has = (words: string[]) =>
      p!.amenities.some((a) => words.some((w) => a.label.toLowerCase().includes(w)));
    // power filter keywords
    expect(has(["generator", "inverter", "solar", "power", "electricity"])).toBe(true);
    // workstay filter keywords
    expect(has(["wi-fi", "wifi", "internet"])).toBe(true);
    // luxury filter keywords (gym/pool/hot tub/cinema)
    expect(has(["pool", "gym", "swimming pool", "hot tub", "cinema"])).toBe(false);
    // family filter keyword
    expect(has(["family friendly"])).toBe(true);
  });
});
