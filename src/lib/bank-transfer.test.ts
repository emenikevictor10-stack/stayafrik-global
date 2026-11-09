import { describe, expect, it } from "vitest";
import { canDecideTransfer, secondsLeft, transferState } from "./bank-transfer";
import { DEFAULT_FEATURES } from "./settings";

const base = Date.parse("2026-11-09T10:00:00Z");
const twoHours = new Date(base + 120 * 60_000).toISOString();

describe("bank transfers", () => {
  it("gives the guest 2 hours (7200s) to pay", () => {
    expect(secondsLeft({ expires_at: twoHours }, base)).toBe(7200);
  });
  it("an unpaid transfer counts as expired once its time runs out", () => {
    expect(transferState({ status: "awaiting_proof", expires_at: twoHours, amount_kobo: 1 }, base + 121 * 60_000)).toBe("expired");
  });
  it("a sent receipt stays waiting for staff even after the 2 hours", () => {
    expect(transferState({ status: "submitted", expires_at: twoHours, amount_kobo: 1 }, base + 600 * 60_000)).toBe("submitted");
  });
  it("only admin and finance can approve or reject", () => {
    expect(canDecideTransfer(["finance"])).toBe(true);
    expect(canDecideTransfer(["admin"])).toBe(true);
    expect(canDecideTransfer(["support", "listings"])).toBe(false);
  });
  it("bank transfer is switched on by default", () => {
    expect(DEFAULT_FEATURES.bank_transfer).toBe(true);
  });
});
