import { describe, it, expect } from "vitest";
import { payoutBlockReason, payoutsCsv } from "@/lib/payout-rules";

const ok = { suspended: false, hasBank: true, bankVerified: true, idRequired: false, idApproved: false };

describe("payoutBlockReason", () => {
  it("allows a verified, active host", () => expect(payoutBlockReason(ok)).toBeNull());
  it("blocks suspended hosts", () => expect(payoutBlockReason({ ...ok, suspended: true })).toBe("Host is suspended"));
  it("blocks unchecked bank accounts", () => expect(payoutBlockReason({ ...ok, bankVerified: false })).toBe("Bank account not checked"));
  it("blocks missing bank", () => expect(payoutBlockReason({ ...ok, hasBank: false })).toBe("No bank account added"));
  it("blocks when ID gate is on and ID not approved", () => expect(payoutBlockReason({ ...ok, idRequired: true })).toBe("ID not approved"));
});

describe("payoutsCsv", () => {
  it("escapes commas and quotes", () => {
    const csv = payoutsCsv([{ id: "p1", status: "paid", amount: 270000, host: 'Ada "A", Obi', email: null, bank: null, listing_code: "SG1234AB", check_in: "2026-11-01", due_at: null, paid_reference: "TRF1", hold_reason: null }]);
    expect(csv.split("\n")[1]).toBe('p1,paid,270000,"Ada ""A"", Obi",,,SG1234AB,2026-11-01,,TRF1,');
  });
});
