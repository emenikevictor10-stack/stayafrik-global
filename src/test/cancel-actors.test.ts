import { describe, it, expect } from "vitest";
import { cancelRefund } from "../../supabase/functions/_shared/cancellation-core";

const late = new Date("2026-11-09T13:00:00Z"); // under 48h before 2026-11-10 check-in
describe("who cancels decides the refund", () => {
  it("guest within 48h gets 50%", () => {
    expect(cancelRefund({ total: 100000, checkInDate: "2026-11-10", actor: "guest" }, late)).toEqual({ amount: 50000, percent: 50 });
  });
  it("host cancel always refunds 100%", () => {
    expect(cancelRefund({ total: 100000, checkInDate: "2026-11-10", actor: "host" }, late).amount).toBe(100000);
  });
  it("RayProp cancel always refunds 100%", () => {
    expect(cancelRefund({ total: 80000, checkInDate: "2026-11-10", actor: "partner" }, late).amount).toBe(80000);
  });
  it("admin can set a custom amount", () => {
    expect(cancelRefund({ total: 100000, checkInDate: "2026-11-10", actor: "admin", adminAmount: 30000 }, late)).toEqual({ amount: 30000, percent: 30 });
  });
  it("admin amount above the total is refused", () => {
    expect(() => cancelRefund({ total: 100000, checkInDate: "2026-11-10", actor: "admin", adminAmount: 100001 }, late)).toThrow();
  });
});
