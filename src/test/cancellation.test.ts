import { describe, it, expect } from "vitest";
import { refundPercent, refundAmount } from "../../supabase/functions/_shared/cancellation-core";

// Check-in 2026-11-10 at 14:00 Lagos time (13:00 UTC)
const at = (iso: string) => new Date(iso);

describe("local cancellation policy", () => {
  it("full refund when cancelled 48h or more before check-in", () => {
    expect(refundPercent("2026-11-10", at("2026-11-08T13:00:00Z"))).toBe(100);
  });
  it("50% refund within 48h of check-in", () => {
    expect(refundPercent("2026-11-10", at("2026-11-09T13:00:00Z"))).toBe(50);
    expect(refundAmount(270000, "2026-11-10", at("2026-11-09T13:00:00Z"))).toBe(135000);
  });
  it("no refund once check-in has passed", () => {
    expect(refundPercent("2026-11-10", at("2026-11-10T14:00:00Z"))).toBe(0);
  });
});
