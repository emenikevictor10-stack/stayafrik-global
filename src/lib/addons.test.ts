import { describe, expect, it } from "vitest";
import { addonRefundKobo, addonsForCity, canBuyAddon, guestAddonCancelNext, staffAddonNext } from "./addons";

describe("extras stages", () => {
  it("staff confirm a paid order, then mark it done", () => {
    expect(staffAddonNext("paid", "confirm")).toBe("confirmed");
    expect(staffAddonNext("confirmed", "done")).toBe("done");
    expect(staffAddonNext("paid", "done")).toBeNull();
  });
  it("cancelling a paid order makes a refund due; refund then closes it", () => {
    expect(staffAddonNext("confirmed", "cancel")).toBe("refund_due");
    expect(staffAddonNext("refund_due", "refunded")).toBe("refunded");
    expect(staffAddonNext("done", "cancel")).toBeNull();
  });
  it("guests can cancel only before staff confirm", () => {
    expect(guestAddonCancelNext("pending_payment")).toBe("cancelled");
    expect(guestAddonCancelNext("paid")).toBe("refund_due");
    expect(guestAddonCancelNext("confirmed")).toBeNull();
  });
});

describe("extras refunds", () => {
  it("refunds the full price once paid, nothing if unpaid", () => {
    expect(addonRefundKobo("paid", 2500000)).toBe(2500000);
    expect(addonRefundKobo("confirmed", 1000000)).toBe(1000000);
    expect(addonRefundKobo("pending_payment", 2500000)).toBe(0);
  });
});

describe("extras by city and timing", () => {
  const list = [{ id: "a", city_id: null }, { id: "b", city_id: "lagos" }];
  it("shows city-less extras everywhere and city extras only in that city", () => {
    expect(addonsForCity(list, "abuja").map((a) => a.id)).toEqual(["a"]);
    expect(addonsForCity(list, "lagos").map((a) => a.id)).toEqual(["a", "b"]);
    expect(addonsForCity(list, null).map((a) => a.id)).toEqual(["a"]);
  });
  it("allows buying only for confirmed/awaiting-host trips up to check-in day", () => {
    expect(canBuyAddon("confirmed", "2026-11-10", "2026-11-10")).toBe(true);
    expect(canBuyAddon("confirmed", "2026-11-09", "2026-11-10")).toBe(false);
    expect(canBuyAddon("held", "2026-12-01", "2026-11-10")).toBe(false);
  });
});
