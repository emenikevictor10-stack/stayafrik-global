import { describe, it, expect } from "vitest";
import { reconcileTarget, walletLow } from "../../supabase/functions/_shared/rayprop-core";

describe("partner reconcile", () => {
  it("confirms a stuck processing booking RayProp says is booked", () => {
    expect(reconcileTarget("processing", "booked")).toBe("confirmed");
  });
  it("flags a processing booking RayProp says failed", () => {
    expect(reconcileTarget("processing", "payment_failed")).toBe("needs_attention");
  });
  it("never touches bookings that aren't stuck", () => {
    expect(reconcileTarget("confirmed", "cancelled")).toBeNull();
  });
  it("ignores unknown RayProp statuses", () => {
    expect(reconcileTarget("needs_attention", "pending")).toBeNull();
  });
});

describe("wallet low check", () => {
  it("is low below the threshold", () => {
    expect(walletLow({ data: { balance_kobo: 50_000 } }, 100_000)).toBe(true);
  });
  it("is fine at or above the threshold", () => {
    expect(walletLow({ balance: 100_000 }, 100_000)).toBe(false);
  });
  it("is unknown when no balance is returned", () => {
    expect(walletLow({}, 100_000)).toBeNull();
  });
});
