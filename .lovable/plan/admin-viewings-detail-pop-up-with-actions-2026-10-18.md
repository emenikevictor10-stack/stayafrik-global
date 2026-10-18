# Admin Viewings: detail pop-up with actions

## What you'll get
- Tap any request on **Admin → Viewings** to open a pop-up showing:
  - the stay, with its photo, listing ID and a link to open it
  - guest and host names, emails and phone numbers
  - the guest's message, plus when the request was made, the visit time and when the hold ends
- Buttons, depending on the request's status:
  - **Pending:** Approve, Decline (with an optional reason)
  - **Approved:** Cancel hold
  - **Expired, declined or cancelled:** no buttons
- Each action asks you to confirm first. It uses the same rules as when a host acts: the 4-hour hold starts at the visit time and the guest is emailed. It's also recorded in the admin audit log.
- The list refreshes after each action.

## Technical details
- New `ViewingDetailDialog` inside `src/pages/admin/AdminReservations.tsx` (shadcn Dialog + AlertDialog for confirm).
- Actions via existing `updateReservationStatus` (admins already allowed by the reservations update policy); the trigger handles expiry time and notifications.
- `logAdminAction({ action: "viewing_<status>", entityType: "reservation", entityId, metadata: { listing_code, reason } })`.
- Fetch listing `images` and profile `phone` in the existing queries.
