import { describe, it, expect } from "vitest";
import { tripNextStep, canCancel, canReview, canMoveDates, hasInvoice } from "@/lib/trip-next-step";

describe("trip next step", () => {
  it("before check-in", () => expect(tripNextStep("confirmed", "2026-12-10", "2026-12-12", "2026-12-01")).toContain("Check in on 2026-12-10"));
  it("after stay asks for review", () => expect(tripNextStep("completed", "2026-12-10", "2026-12-12", "2026-12-20")).toContain("review"));
  it("reviewed says thanks", () => expect(tripNextStep("completed", "2026-12-10", "2026-12-12", "2026-12-20", true)).toBe("Thanks for staying with us."));
  it("awaiting host mentions refund", () => expect(tripNextStep("awaiting_host", "a", "b", "c")).toContain("refunded"));
});

describe("trip actions", () => {
  it("cancel only before check-in", () => { expect(canCancel("confirmed", "2026-12-01", "2026-12-10")).toBe(true); expect(canCancel("confirmed", "2026-12-10", "2026-12-10")).toBe(false); });
  it("review only after check-out", () => { expect(canReview("released", "2026-12-12", "2026-12-12")).toBe(true); expect(canReview("released", "2026-12-11", "2026-12-12")).toBe(false); });
  it("move dates only before check-in", () => expect(canMoveDates("cancelled", "2026-12-01", "2026-12-10")).toBe(false));
  it("no invoice for cancelled", () => { expect(hasInvoice("cancelled")).toBe(false); expect(hasInvoice("held")).toBe(true); });
});
