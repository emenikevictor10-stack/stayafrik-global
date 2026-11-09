# Phase 18 (Guest details and ID) — close-out

Phase 18 is ticked in the roadmap, but checking it against the brief shows gaps. It is not finished yet.

## What already works
- `/details` page: full name, phone (+234), and optionally NIN last 4 digits or a passport photo.
- "ID required before paying" switch in Admin Settings (off by default).
- When the switch is on, checkout sends guests to `/details` first and brings them back.
- Admin "ID review" page with the document photo (private link), Approve and Reject.

## Gaps found
1. **The server doesn't check the ID rule.** Only the checkout screen checks it, so a payment (card or bank transfer) can still start without an ID.
2. **A rejected ID still counts.** Checkout lets a guest pay if they've ever sent an ID, even one staff rejected.
3. **Passport details missing.** The brief asks for full name, country and passport number with the photo, on its own `/details/passport` screen. Today it's just a photo.
4. **Guests never hear the outcome.** No alert when an ID is approved or rejected, and the rejection reason isn't shown on `/details`, so they can't fix it and resend.
5. **Reject wording is wrong.** The reason box says "shown to the host". It's a pop-up instead of a proper dialog with a required reason.
6. **"Next stay" isn't shown** on ID review cards, so staff can't see who to check first.
7. **Guest and host ID share one record.** If a host who is already approved sends an ID as a guest, it overwrites their approved host ID and can block their payouts.
8. **Status words.** Raw words like "pending" show to guests. They should read "Being checked", "Checked" or "Not accepted", and nothing should say "verified" until staff approve.

## What I'll do
- Add the ID check to the payment start on the server, for card and bank transfer, for our own and partner stays. Only an ID that is waiting for review or approved will count.
- Fix the checkout check to match.
- Add a `/details/passport` screen with name, country, number and photo.
- Show the status and any rejection reason on `/details`, with a "Send again" option.
- Send an in-app alert to the guest when staff approve or reject.
- ID review: a proper Reject dialog with a required reason (shown to the guest), the guest's next stay on each card, and waiting IDs with the soonest stay listed first.
- Keep an approved ID from being overwritten by a new one. A new one goes back to "being checked" only if the old one was rejected or missing.
- Add tests for the rule "switch on + no ID, or a rejected ID = can't pay", then run them and check the screens on a phone and a computer.

## Technical details
- `paystack-init`: read `features.id_required` via `_shared/settings.ts`. If it's on, require a `kyc_submissions` row with status `pending` or `approved`. Otherwise return 403 `id_required`, and the client sends the guest to `/details`.
- Pure helper `idAllowsPayment(status, required)` in `src/lib/guest-id.ts`, mirrored in `_shared`, with tests.
- Migration: add `country` and `full_name` columns to `kyc_submissions`. Add a SECURITY DEFINER `submit_guest_id` RPC that refuses to overwrite `approved`, and a `staff_kyc_action` RPC (approve/reject + reason, audit, notification) checked with `private.has_any_role`.
- Route `/details/passport` in `App.tsx`. AdminKyc uses `staff_kyc_action` and joins the next confirmed/held booking.
