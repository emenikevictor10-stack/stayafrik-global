import { describe, it, expect } from "vitest";
import { features, num, serviceFee } from "@/lib/settings";

describe("settings", () => {
  it("8% fee on ₦100,000 is ₦8,000", () => expect(serviceFee(100000, 800)).toBe(8000));
  it("10% fee on ₦100,000 is ₦10,000", () => expect(serviceFee(100000, 1000)).toBe(10000));
  it("missing fee falls back to default", () => expect(num({}, "service_fee_bps", 800)).toBe(800));
  it("wrong-type fee falls back", () => expect(num({ service_fee_bps: "abc" }, "service_fee_bps", 800)).toBe(800));
  it("report_problem defaults on, id_required defaults off", () => {
    const f = features({});
    expect(f.report_problem).toBe(true); expect(f.id_required).toBe(false);
  });
  it("a saved switch overrides the default", () => expect(features({ features: { report_problem: false } }).report_problem).toBe(false));
});
