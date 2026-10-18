import { describe, it, expect } from "vitest";
import { chainOf, filterLocations, locNorm, type Location } from "./locations";

const L = (id: string, name: string, type: Location["type"], parent: string | null, aliases: string[] = [], n = 0): Location =>
  ({ id, name, slug: id, type, parent_id: parent, aliases, listing_count: n });
const all = [
  L("lag", "Lagos", "state", null), L("lek", "Lekki", "city", "lag", [], 50), L("chev", "Chevron", "neighbourhood", "lek", ["Chevy"]),
  L("p1", "Lekki Phase 1", "neighbourhood", "lek", ["Lekki Ph 1"], 40), L("vi", "Victoria Island", "city", "lag", ["VI"]),
];
const byId = new Map(all.map((l) => [l.id, l]));

describe("locations", () => {
  it("normalises punctuation and case", () => expect(locNorm("  F.C.T ")).toBe("f c t"));
  it("tagging a neighbourhood fills its city and state", () => {
    const c = chainOf("chev", byId);
    expect([c.neighbourhood?.name, c.city?.name, c.state?.name]).toEqual(["Chevron", "Lekki", "Lagos"]);
  });
  it("'chev' finds Chevron", () => expect(filterLocations(all, "chev")[0].name).toBe("Chevron"));
  it("'lek' finds Lekki before Lekki Phase 1", () => expect(filterLocations(all, "lek").map((l) => l.name).slice(0, 2)).toEqual(["Lekki", "Lekki Phase 1"]));
  it("'vi' finds Victoria Island via its other spelling", () => expect(filterLocations(all, "vi")[0].name).toBe("Victoria Island"));
  it("unknown text finds nothing", () => expect(filterLocations(all, "xyzq")).toEqual([]));
});
