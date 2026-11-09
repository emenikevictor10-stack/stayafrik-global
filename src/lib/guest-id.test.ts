import { describe, it, expect } from "vitest";
import { idAllowsPayment, idStatusLabel } from "./guest-id";

describe("guest ID rule", () => {
  it("switch off: anyone can pay", () => expect(idAllowsPayment(null, false)).toBe(true));
  it("switch on + no ID: can't pay", () => expect(idAllowsPayment(null, true)).toBe(false));
  it("switch on + rejected ID: can't pay", () => expect(idAllowsPayment("rejected", true)).toBe(false));
  it("switch on + ID being checked: can pay", () => expect(idAllowsPayment("pending", true)).toBe(true));
  it("switch on + approved: can pay", () => expect(idAllowsPayment("approved", true)).toBe(true));
  it("never says checked before approval", () => expect(idStatusLabel("pending")).toBe("Being checked"));
});
