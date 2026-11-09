import { describe, it, expect } from "vitest";
import { approxPoint, AREA_CIRCLE_M, hasCoords, sharedLocations, areaView as _areaView } from "@/lib/map-pins";

const metres = (a: [number, number], b: [number, number]) => Math.hypot((a[0] - b[0]) * 111_000, (a[1] - b[1]) * 111_000 * Math.cos((a[0] * Math.PI) / 180));

describe("map privacy", () => {
  it("area circle always contains the real location", () => {
    for (let i = 0; i < 200; i++) {
      const p = approxPoint(`id-${i}`, 6.5, 3.38);
      expect(metres(p, [6.5, 3.38])).toBeLessThan(AREA_CIRCLE_M);
    }
  });
  it("missing or 0,0 locations are not mapped", () => {
    expect(hasCoords({ lat: 0, lng: 0 })).toBe(false);
    expect(hasCoords({ lat: null, lng: 3 })).toBe(false);
    expect(hasCoords({ lat: 6.5, lng: 3.4 })).toBe(true);
  });
  it("finds 3+ stays sharing one spot, ignores spread-out stays", () => {
    const g = sharedLocations([
      { id: "a", lat: 6.5000, lng: 3.38 }, { id: "b", lat: 6.50001, lng: 3.38001 }, { id: "c", lat: 6.5, lng: 3.38 },
      { id: "d", lat: 6.6, lng: 3.5 }, { id: "e", lat: 6.45, lng: 3.6 },
    ]);
    expect(g).toHaveLength(1);
    expect(g[0].map((x) => x.id).sort()).toEqual(["a", "b", "c"]);
  });
});

describe("stay page area map", () => {
  it("before payment never centres on the exact spot, but the circle contains it", () => {
    for (const id of ["a", "SG2345LT", "rp_316281JR", "xyz-123"]) {
      const v = _areaView(id, 6.45, 3.47, true);
      const d = metres(v.center, [6.45, 3.47]);
      expect(d).toBeGreaterThan(200);
      expect(d).toBeLessThan(v.radius);
    }
  });
  it("after payment shows the exact spot with no circle", () => {
    expect(_areaView("a", 6.45, 3.47, false)).toEqual({ center: [6.45, 3.47], radius: 0 });
  });
});
