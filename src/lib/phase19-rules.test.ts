import { describe, expect, it } from "vitest";
import { blockedMessage, isBlocked, normaliseReply } from "../../supabase/functions/_shared/user-block-core";
import { canOpen } from "@/components/admin/adminNav";

describe("blocked users", () => {
  it("a blocked user cannot pay", () => {
    expect(isBlocked({ blocked_at: "2026-11-09T10:00:00Z" })).toBe(true);
  });
  it("an unblocked or unknown user can pay", () => {
    expect(isBlocked({ blocked_at: null })).toBe(false);
    expect(isBlocked(null)).toBe(false);
  });
  it("the notice names the support email", () => {
    expect(blockedMessage("support@stayglobal.app")).toContain("support@stayglobal.app");
  });
});

describe("settings are admin-only", () => {
  it("support, finance and listings staff cannot open Settings", () => {
    for (const r of ["support", "finance", "listings"]) expect(canOpen("/admin/settings", [r])).toBe(false);
  });
  it("admins can open Settings", () => {
    expect(canOpen("/admin/settings", ["admin"])).toBe(true);
  });
});

describe("review replies", () => {
  it("an empty reply removes it", () => {
    expect(normaliseReply("   ")).toBeNull();
  });
  it("a reply is capped at 1000 characters", () => {
    expect(normaliseReply("a".repeat(1200))!.length).toBe(1000);
  });
});
