/** Bank-transfer rules shared by the guest and admin screens. */
export type TransferStatus = "awaiting_proof" | "submitted" | "approved" | "rejected" | "expired";
export type TransferRow = { status: string; expires_at: string; amount_kobo: number };

/** A transfer still waiting for a receipt after its time runs out counts as expired (no timer job needed). */
export const transferState = (t: TransferRow, now = Date.now()): TransferStatus =>
  t.status === "awaiting_proof" && new Date(t.expires_at).getTime() < now ? "expired" : (t.status as TransferStatus);

/** Seconds left to pay. */
export const secondsLeft = (t: Pick<TransferRow, "expires_at">, now = Date.now()) =>
  Math.max(0, Math.floor((new Date(t.expires_at).getTime() - now) / 1000));

/** Only these team roles may approve or reject a transfer. */
export const TRANSFER_DECIDERS = ["admin", "finance"] as const;
export const canDecideTransfer = (roles: string[]) => roles.some((r) => (TRANSFER_DECIDERS as readonly string[]).includes(r));
