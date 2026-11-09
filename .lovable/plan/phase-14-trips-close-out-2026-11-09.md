# Phase 14 (Trips) close-out

Phase 14 is ticked in the roadmap, but checking it against the plan document shows these items are still missing or different.

## Gaps found
1. **Trips list has no tabs.** The plan says Upcoming, Past and Cancelled. Right now it's one long list.
2. **Reviews have no tags.** The plan says stars, tags and a note. Right now there are only stars and a note.
3. **"StayGlobal guarantee" move is missing.** The plan's `/trips/:id/move` means: the place isn't as described, so the guest asks to move and sees similar free stays. What we built is a different feature, "ask to move dates". It stays as it is.
4. **No "Travelling together" page (`/trips/:id/guests`).** Split payment only appears as a panel while the booking is held. Once a trip is confirmed, there's nowhere to see who is coming and who paid.
5. **Check-in pack isn't shown.** Confirmed trips show the address and check-in time, but no access instructions such as gate code or key pickup.
6. **Find-booking link:** the plan says `/help/find-booking`, but we only have `/find-booking`.
7. **Cancel page reason:** I'll check that the guest can give a reason and that it gets saved, and add it if it's missing.

## What I'll build
- Trips list: Upcoming / Past / Cancelled tabs, with the choice kept in the link.
- Review page: tag chips (Clean, Great location, Reliable power, Good water, Quiet, Responsive host, Value for money, Safe area), saved with the review. Admin Reviews will show the tags.
- `/trips/:id/move`: the guest picks a reason, adds a note and up to 3 photos, then sees up to 6 similar stays that are free for the same dates and guests (same city, close in price). Sending the request creates a support issue tagged "guarantee move" in the existing support queue, and staff arrange the move. Nothing moves automatically. The trip page shows the link from check-in day until check-out.
- `/trips/:id/guests`: the people on the trip, each person's share, and who has paid, using the existing split-payment data. The trip page links to it for split bookings.
- Access instructions on stays: hosts get a field in their listing form, and guests see it on the trip page only once the trip is confirmed. Partner stays show their check-in notes if the partner sends any.
- `/help/find-booking` will open the same page as `/find-booking`.
- Tests for the trip-tab grouping and for when the guarantee link shows. I'll check everything in the browser on phone and computer using a short-lived test booking, then delete it.

## Technical notes
- Migration: `reviews.tags text[]`, `listings.access_instructions text` (readable by a guest only through a SECURITY DEFINER function when their booking is confirmed; host can edit their own), and `bookings.cancelled_reason` if missing.
- Guarantee request goes through the existing `create_support_issue` RPC with category `guarantee_move`, so no new write path is added.
- Pure helpers `tripTab()` and `canAskGuarantee()` in `src/lib/trip-next-step.ts`, with tests.
- Update the roadmap P14 line to match.
