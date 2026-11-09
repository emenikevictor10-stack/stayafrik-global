/** One plain sentence telling the guest what happens next on a trip. Pure, tested. */
export const tripNextStep = (status: string, checkIn: string, checkOut: string, today: string, reviewed = false): string => {
  switch (status) {
    case "held":
    case "pending": return "Finish paying to lock these dates before the hold runs out.";
    case "processing": return "We've got your payment and are confirming with the stay. This takes a few minutes.";
    case "awaiting_host": return "You've paid. The host has a short time to accept; if they don't, you're refunded in full.";
    case "needs_attention": return "You've paid. Our team is finishing your booking and will message you shortly.";
    case "confirmed":
      if (today < checkIn) return `You're all set. Check in on ${checkIn}; the full address is below.`;
      if (today < checkOut) return "Enjoy your stay. Tap \"I've checked in\" once you're in, or report a problem if anything is wrong.";
      return "Your stay has ended. Leave a review to help other guests.";
    case "released": return today < checkOut ? "You're checked in. Report a problem any time during your stay." : (reviewed ? "Thanks for staying with us." : "Your stay has ended. Leave a review to help other guests.");
    case "completed": return reviewed ? "Thanks for staying with us." : "Your stay has ended. Leave a review to help other guests.";
    case "declined": return "The host couldn't accept. Your refund is on its way.";
    case "cancelled": return "This booking was cancelled. Any refund due is on its way.";
    case "refunded": return "Your refund has been sent. Banks can take a few days to show it.";
    case "expired": return "This hold expired before payment. Search again to rebook.";
    case "failed": return "Payment didn't go through. You weren't charged; try again.";
    default: return "We'll update you here as your booking moves along.";
  }
};

export const canCancel = (status: string, today: string, checkIn: string) => ["confirmed", "awaiting_host"].includes(status) && today < checkIn;
export const canReview = (status: string, today: string, checkOut: string) => ["confirmed", "released", "completed"].includes(status) && today >= checkOut;
export const canMoveDates = (status: string, today: string, checkIn: string) => ["confirmed", "awaiting_host"].includes(status) && today < checkIn;
/** Which Trips tab a booking belongs to. */
export type TripTab = "upcoming" | "past" | "cancelled";
export const tripTab = (status: string, checkOut: string, today: string): TripTab => {
  if (["cancelled", "refunded", "declined", "expired", "failed"].includes(status)) return "cancelled";
  if (["completed"].includes(status) || today >= checkOut) return "past";
  return "upcoming";
};
/** StayGlobal guarantee: ask to move only during the stay, on a paid booking. */
export const canAskGuarantee = (status: string, today: string, checkIn: string, checkOut: string) =>
  ["confirmed", "released"].includes(status) && today >= checkIn && today < checkOut;
export const hasInvoice = (status: string) => ["held", "pending", "processing", "awaiting_host", "confirmed", "released", "completed", "needs_attention"].includes(status);
