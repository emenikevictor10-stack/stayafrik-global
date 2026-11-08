# Close out Phase 7, then Phase 8: Host portal

## Phase 7 recheck: what's left
- **Confirmed done:** price rules, blocked dates, request-to-book, timeout to decline, calendar import, the hourly refund and import jobs, and payment start using the same price. The rules have tests and the app builds cleanly.
- **Bug found:** the "New booking request" notification sends hosts to a page that doesn't exist. It will point to the host bookings page instead (in Phase 8, the new Requests page).
- **Not yet checked on screen:** the "Prices and calendar" section, and how a waiting request appears in the guest's Trips. First step: open both in a browser on phone and PC and fix anything wrong.

## Phase 8: Host portal (PRD §3)
One home for hosts at `/host`, replacing today's scattered pages under Profile.

1. **Host home (`/host`):** today's check-ins and check-outs, requests waiting for an answer (with a countdown), money held and due, and next-step prompts such as "Add payout account", "Finish your profile" and "2 listings waiting for approval".
2. **Listings (`/host/listings`):** each stay with photo, ID, status (live, pending approval, hidden), price and quick links to edit or open its calendar.
3. **Calendar (`/host/calendar`):** pick a listing to see the full "Prices and calendar" tool on its own page. It stays on Edit listing too.
4. **Requests (`/host/requests`):** Accept and Decline with a reply-by countdown. Declining asks for an optional reason.
5. **Bookings (`/host/bookings`):** Upcoming, Current and Past tabs. Before a booking is confirmed the host sees the guest's first name only; once confirmed they see the full name and phone.
6. **Payouts (`/host/payouts`):** money held, due and paid per booking, using the host's share saved on each booking, plus the payout account status and a link to edit it.
7. **List your place (`/list-your-place`):** a public page explaining how hosting works (8% fee, admin approval, payouts the day after check-in), with "Start listing". Signed-out visitors sign in with Google first.
8. **Navigation:** the menu shows a "Host" section for hosts. Old links (`/listings`, `/escrow`, `/profile/payout`) keep working by redirecting.

## Out of scope
Admin hosts and payouts (Phase 9), host messaging changes, and payout sending (already exists).

## Checks before closing
- Tests: first-name-only rule before confirmation; Upcoming/Current/Past grouping by date; payout totals use the saved host share.
- Browser check of every host page on phone and PC, signed in as a host, including accepting a test request (made and removed in the database).

## Technical details
- Fix the `/agent/escrow` link in `confirm_local_payment` and the notification inserts, pointing them to `/host/requests` (migration).
- Guest names before confirmation: a security-definer `host_booking_guest(_booking_id)` returns the first name only unless the status is confirmed, released or completed. Hosts never read `profiles` directly.
- New `src/pages/host/*` pages, with the shared tool moved to `components/host/RateCalendar`. Host nav entries go in `navTabs.ts`, and the grouping and name helpers in `src/lib/host-portal.ts`, which is tested.
- `/listings` → `/host/listings` and `/escrow` → `/host/payouts` redirects, but only for hosts, because `/escrow` is currently shared with Trips through `ThirdTab`.
