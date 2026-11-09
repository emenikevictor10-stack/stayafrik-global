import { describe, it, expect } from "vitest";
import { invoiceKind, invoiceTotalKobo, showInvoice } from "./settings";
describe("invoices", () => {
  it("held booking gets a proforma", () => expect(invoiceKind("held")).toBe("proforma"));
  it("confirmed booking gets a paid invoice", () => expect(invoiceKind("confirmed")).toBe("paid"));
  it("cancelled unpaid booking gets none", () => expect(invoiceKind("cancelled")).toBeNull());
  it("total includes paid extras", () => expect(invoiceTotalKobo(19_440_000, [2_500_000, 1_500_000])).toBe(23_440_000));
  it("switch off hides the button", () => expect(showInvoice(false, "confirmed")).toBe(false));
});
