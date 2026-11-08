import { describe, it, expect } from "vitest";
import { listingNextStep, viewingNextStep, payoutNextStep, supportNextStep, kycNextStep } from "@/lib/next-step";

describe("next step", () => {
  it("unverified listing asks to approve", () => expect(listingNextStep({ verified: false })).toMatchObject({ tone: "act", action: "Approve" }));
  it("live listing has no action", () => expect(listingNextStep({ verified: true }).action).toBeUndefined());
  it("pending payout shows amount and Mark paid", () => {
    const s = payoutNextStep({ status: "pending", amount: 92000, host: "Ada" });
    expect(s.action).toBe("Mark paid"); expect(s.sentence).toContain("92,000"); expect(s.sentence).toContain("Ada");
  });
  it("failed payout is broken", () => expect(payoutNextStep({ status: "failed", amount: 1 }).tone).toBe("broken"));
  it("new unassigned problem asks to assign", () => expect(supportNextStep({ status: "received", assigned_to: null }).action).toBe("Assign to me"));
  it("pending viewing asks to approve", () => expect(viewingNextStep({ status: "pending" }).action).toBe("Approve"));
  it("pending ID asks to approve ID", () => expect(kycNextStep({ status: "pending" }).action).toBe("Approve ID"));
});

import { bookingNextStep, partnerNextStep, userNextStep } from "@/lib/next-step";
describe("next step: bookings and users", () => {
  it("needs-attention booking is broken", () => expect(bookingNextStep({ status: "needs_attention" }).tone).toBe("broken"));
  it("cancelled booking has no button", () => expect(bookingNextStep({ status: "cancelled" }).action).toBeUndefined());
  it("partner needs-attention offers Retry", () => expect(partnerNextStep({ status: "needs_attention" }).action).toBe("Retry"));
  it("partner confirmed has no button", () => expect(partnerNextStep({ status: "confirmed" }).action).toBeUndefined());
  it("user with ID waiting gets Review ID", () => expect(userNextStep({ kycPending: true, profileComplete: true }).action).toBe("Review ID"));
  it("blocked user shows reason", () => expect(userNextStep({ kycPending: true, profileComplete: true, blocked: true, blockReason: "fraud" }).sentence).toContain("fraud"));
});
