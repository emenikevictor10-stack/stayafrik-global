import type { DotTone } from "./support";

export type NextStepInfo = { tone: DotTone; status: string; sentence: string; action?: string };
const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;

export const listingNextStep = (l: { verified: boolean }): NextStepInfo => l.verified
  ? { tone: "done", status: "Live", sentence: "This stay is approved and guests can book it." }
  : { tone: "act", status: "In review", sentence: "Nobody at StayGlobal has checked this place yet.", action: "Approve" };

export const viewingNextStep = (r: { status: string; guest?: string | null }): NextStepInfo => {
  const who = r.guest || "The guest";
  switch (r.status) {
    case "pending": return { tone: "act", status: "Waiting", sentence: `${who} wants to view this stay. Approve to hold it for 4 hours.`, action: "Approve" };
    case "approved": return { tone: "done", status: "Approved", sentence: `The stay is held for ${who} for 4 hours.` };
    case "rejected": return { tone: "broken", status: "Declined", sentence: "This viewing was declined." };
    default: return { tone: "fact", status: r.status.charAt(0).toUpperCase() + r.status.slice(1), sentence: "Nothing to do here." };
  }
};

export const payoutNextStep = (p: { status: string; amount: number; host?: string | null }): NextStepInfo => {
  const who = p.host || "the host";
  if (p.status === "pending") return { tone: "act", status: "Due", sentence: `Payout of ${naira(p.amount)} to ${who} is due. Send it, then mark it paid.`, action: "Mark paid" };
  if (p.status === "failed") return { tone: "broken", status: "Failed", sentence: `The payout to ${who} failed. Check the bank details and try again.`, action: "Move back to pending" };
  if (p.status === "paid") return { tone: "done", status: "Paid", sentence: `${naira(p.amount)} was paid to ${who}.` };
  return { tone: "fact", status: p.status, sentence: "Nothing to do here." };
};

export const supportNextStep = (i: { status: string; assigned_to?: string | null; guest?: string | null }): NextStepInfo => {
  const who = i.guest || "The guest";
  if (["received"].includes(i.status) && !i.assigned_to) return { tone: "act", status: "New", sentence: `Nobody has picked this up yet. ${who} is waiting for a reply.`, action: "Assign to me" };
  if (i.status === "asked_fixed") return { tone: "fact", status: "Asked if fixed", sentence: `We asked ${who} if it's fixed. Close it once they say yes.`, action: "Close" };
  if (i.status.startsWith("closed") || i.status === "resolved") return { tone: "done", status: "Closed", sentence: "This problem is closed." };
  return { tone: "act", status: "In progress", sentence: `Reply to ${who} and keep them updated.` };
};

export const kycNextStep = (k: { status: string; name?: string | null }): NextStepInfo => {
  const who = k.name || "This host";
  if (k.status === "pending") return { tone: "act", status: "Waiting", sentence: `${who} sent an ID. Check it matches their name.`, action: "Approve ID" };
  if (k.status === "approved") return { tone: "done", status: "Approved", sentence: `${who}'s ID is approved.` };
  return { tone: "broken", status: "Rejected", sentence: `${who}'s ID was rejected.` };
};

export const bookingNextStep = (b: { status: string }): NextStepInfo => {
  switch (b.status) {
    case "needs_attention": return { tone: "broken", status: "Needs attention", sentence: "Something went wrong after payment. Check it now." };
    case "pending": return { tone: "fact", status: "Unpaid", sentence: "The guest hasn't paid yet. Nothing to do." };
    case "confirmed": case "paid": case "escrow": case "held":
      return { tone: "fact", status: "Money held", sentence: "The money is held. It goes to the host after check-out." };
    case "released": case "completed": return { tone: "done", status: "Completed", sentence: "The stay is over and the host's share has been released." };
    case "cancelled": return { tone: "fact", status: "Cancelled", sentence: "This booking was cancelled." };
    case "refunded": return { tone: "done", status: "Refunded", sentence: "The guest has been refunded." };
    default: return { tone: "fact", status: b.status.replace(/_/g, " "), sentence: "Nothing to do." };
  }
};

export const partnerNextStep = (b: { status: string; guest?: string | null }): NextStepInfo => {
  const who = b.guest || "The guest";
  switch (b.status) {
    case "needs_attention": return { tone: "broken", status: "Needs attention", sentence: `${who} paid, but RayProp didn't confirm. Retry or refund.`, action: "Retry" };
    case "processing": return { tone: "act", status: "Confirming", sentence: "Payment received. Waiting for RayProp to confirm." };
    case "confirmed": return { tone: "done", status: "Confirmed", sentence: "RayProp confirmed this stay." };
    case "refunded": return { tone: "done", status: "Refunded", sentence: `${who} has been refunded.` };
    case "cancelled": return { tone: "fact", status: "Cancelled", sentence: "This booking was cancelled." };
    default: return { tone: "fact", status: b.status.replace(/_/g, " "), sentence: "Nothing to do." };
  }
};

export const userNextStep = (u: { kycPending: boolean; profileComplete: boolean; blocked?: boolean; blockReason?: string | null }): NextStepInfo => {
  if (u.blocked) return { tone: "broken", status: "Blocked", sentence: u.blockReason ? `Blocked: ${u.blockReason}` : "This account is blocked." };
  if (u.kycPending) return { tone: "act", status: "ID waiting", sentence: "This person sent an ID. Check it matches their name.", action: "Review ID" };
  if (!u.profileComplete) return { tone: "fact", status: "Profile incomplete", sentence: "This person hasn't finished their profile." };
  return { tone: "done", status: "All good", sentence: "Nothing to do." };
};
