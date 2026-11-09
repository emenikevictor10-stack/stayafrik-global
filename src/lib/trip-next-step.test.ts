import { describe, it, expect } from "vitest";
import { tripTab, canAskGuarantee } from "./trip-next-step";

describe("tripTab", () => {
  it("cancelled-type statuses go to Cancelled", () => {
    for (const s of ["cancelled", "refunded", "declined", "expired", "failed"]) expect(tripTab(s, "2099-01-01", "2026-01-01")).toBe("cancelled");
  });
  it("confirmed stay before check-out is Upcoming", () => expect(tripTab("confirmed", "2026-01-05", "2026-01-04")).toBe("upcoming"));
  it("on check-out day it is Past", () => expect(tripTab("confirmed", "2026-01-05", "2026-01-05")).toBe("past"));
  it("completed is Past", () => expect(tripTab("completed", "2099-01-05", "2026-01-01")).toBe("past"));
});

describe("canAskGuarantee", () => {
  it("not before check-in", () => expect(canAskGuarantee("confirmed", "2026-01-01", "2026-01-02", "2026-01-05")).toBe(false));
  it("yes on check-in day", () => expect(canAskGuarantee("confirmed", "2026-01-02", "2026-01-02", "2026-01-05")).toBe(true));
  it("not on check-out day", () => expect(canAskGuarantee("released", "2026-01-05", "2026-01-02", "2026-01-05")).toBe(false));
  it("not on cancelled bookings", () => expect(canAskGuarantee("cancelled", "2026-01-03", "2026-01-02", "2026-01-05")).toBe(false));
});
