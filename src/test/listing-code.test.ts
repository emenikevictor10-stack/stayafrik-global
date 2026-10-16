import { describe, it, expect } from "vitest";
import { LOCAL_LISTING_CODE, partnerListingCode, displayListingCode } from "@/lib/rayprop-map";

describe("listing codes", () => {
  it("local codes are SG + 4 digits + 2 letters", () => {
    expect(LOCAL_LISTING_CODE.test("SG2345LT")).toBe(true);
    expect(LOCAL_LISTING_CODE.test("SG234LT")).toBe(false);
    expect(LOCAL_LISTING_CODE.test("SG2345L1")).toBe(false);
  });
  it("partner codes use the RayProp listing id", () => {
    expect(partnerListingCode("rp_1C1F9KRZ")).toBe("RP-1C1F9KRZ");
    expect(displayListingCode("RP-1C1F9KRZ")).toBe("RP·1C1F9KRZ");
  });
});
