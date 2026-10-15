import { describe, it, expect } from "vitest";
import { raypropMatches } from "../../supabase/functions/_shared/rayprop-core";

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
