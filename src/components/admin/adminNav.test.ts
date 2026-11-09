import { describe, it, expect } from "vitest";
import { canOpen, navFor } from "./adminNav";

describe("team role access", () => {
  it("admin opens everything including Team and Settings", () => {
    expect(canOpen("/admin/team", ["admin"])).toBe(true);
    expect(canOpen("/admin/settings", ["admin"])).toBe(true);
  });
  it("finance opens payouts but not team, settings or support", () => {
    expect(canOpen("/admin/payouts", ["finance"])).toBe(true);
    expect(canOpen("/admin/team", ["finance"])).toBe(false);
    expect(canOpen("/admin/settings", ["finance"])).toBe(false);
    expect(canOpen("/admin/support", ["finance"])).toBe(false);
  });
  it("support opens support and user detail pages but not payouts", () => {
    expect(canOpen("/admin/support", ["support"])).toBe(true);
    expect(canOpen("/admin/users/abc", ["support"])).toBe(true);
    expect(canOpen("/admin/payouts", ["support"])).toBe(false);
  });
  it("listings role sees listing approvals and ID review only in its areas", () => {
    expect(canOpen("/admin/listings", ["listings"])).toBe(true);
    expect(canOpen("/admin/kyc", ["listings"])).toBe(true);
    expect(canOpen("/admin/payments", ["listings"])).toBe(false);
  });
  it("menu hides the Team group from non-admins", () => {
    expect(navFor(["support"]).some((g) => g.group === "Team")).toBe(false);
    expect(navFor(["admin"]).some((g) => g.group === "Team")).toBe(true);
  });
});
