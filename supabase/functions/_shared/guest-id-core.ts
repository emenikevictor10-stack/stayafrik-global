/** Pure guest-ID rules (no Deno APIs) — mirrored by src/lib/guest-id.ts. */
export const ID_OK_STATUSES = ["pending", "approved"] as const;

/** Can this guest start a payment? Only waiting-for-review or approved IDs count when the switch is on. */
export const idAllowsPayment = (status: string | null | undefined, required: boolean): boolean =>
  !required || (!!status && (ID_OK_STATUSES as readonly string[]).includes(status));

/** Plain words for guests — never "verified" until staff approve. */
export const idStatusLabel = (status: string | null | undefined): string =>
  status === "approved" ? "Checked" : status === "pending" ? "Being checked" : status === "rejected" ? "Not accepted" : "Not sent";
