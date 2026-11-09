/** Extras (add-ons) rules — mirrored by the staff_addon_action / guest_addon_cancel database functions. */
export type AddonStatus = "pending_payment" | "paid" | "needs_attention" | "confirmed" | "done" | "refund_due" | "refunded" | "cancelled";
export type AddonAction = "confirm" | "done" | "cancel" | "refunded";

const STAFF: Record<AddonAction, Partial<Record<AddonStatus, AddonStatus>>> = {
  confirm: { paid: "confirmed", needs_attention: "confirmed" },
  done: { confirmed: "done" },
  cancel: { pending_payment: "cancelled", paid: "refund_due", needs_attention: "refund_due", confirmed: "refund_due" },
  refunded: { refund_due: "refunded" },
};

/** Next status after a staff action, or null if not allowed. */
export const staffAddonNext = (from: AddonStatus, action: AddonAction): AddonStatus | null => STAFF[action][from] ?? null;

/** Guests may cancel only before staff confirm. Paid orders become refund_due. */
export const guestAddonCancelNext = (from: AddonStatus): AddonStatus | null =>
  from === "pending_payment" ? "cancelled" : from === "paid" || from === "needs_attention" ? "refund_due" : null;

/** Amount (kobo) refunded when an order is cancelled: full price if money was taken, else 0. */
export const addonRefundKobo = (from: AddonStatus, amountKobo: number): number =>
  ["paid", "needs_attention", "confirmed"].includes(from) ? Math.max(0, Math.round(amountKobo)) : 0;

/** Extras with no city are offered everywhere; others only for stays in that city. */
export const addonsForCity = <T extends { city_id: string | null }>(addons: T[], cityId: string | null | undefined): T[] =>
  addons.filter((a) => !a.city_id || (!!cityId && a.city_id === cityId));

/** Extras can be bought for confirmed or awaiting-host trips up to check-in day (YYYY-MM-DD). */
export const canBuyAddon = (bookingStatus: string, checkIn: string, today: string): boolean =>
  ["confirmed", "awaiting_host"].includes(bookingStatus) && checkIn >= today;

export const ADDON_STATUS_LABEL: Record<string, string> = {
  pending_payment: "Awaiting payment", paid: "Paid — being arranged", needs_attention: "Being checked",
  confirmed: "Confirmed", done: "Done", refund_due: "Refund on its way", refunded: "Refunded", cancelled: "Cancelled",
};
