import type { DotTone } from "@/lib/support";

/** PRD §9: orange = act, red = broken, blue = done, grey = fact. */
const ACT = ["pending", "pending_review", "processing", "needs_attention", "requested", "submitted", "awaiting", "open", "held", "escrow", "hold", "in_review", "waiting", "on_hold"];
const BROKEN = ["failed", "rejected", "declined", "cancelled", "canceled", "refund_failed", "disputed", "expired_unpaid", "error", "suspended", "revoked"];
const DONE = ["confirmed", "approved", "paid", "released", "completed", "verified", "success", "active", "refunded", "resolved", "closed_fixed"];

export const toneFor = (status: string | null | undefined): DotTone => {
  const s = (status || "").toLowerCase();
  if (ACT.includes(s)) return "act";
  if (BROKEN.includes(s)) return "broken";
  if (DONE.includes(s)) return "done";
  return "fact";
};

export const statusLabel = (status: string | null | undefined) => {
  const s = (status || "").replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
};
