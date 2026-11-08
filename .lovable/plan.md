# Phase 6: Booking lifecycle

Goal: every booking, local or RayProp, moves through the same steps. Each step is recorded in a timeline, so Admin can see who did what and when. What we earn on each booking is saved at the time it's paid, not worked out later.

## Current state
- There are no bookings yet, so nothing old needs converting.
- Statuses are loose text: pending, confirmed, released, cancelled and needs_attention.
- The host payout is worked out at release as "total ÷ 1.08". That breaks if the fee setting changes.
- Nothing stops two paid bookings landing on the same nights at the database level. Today only a check at payment start (409) does that.
- Guests and hosts can currently edit their own booking row directly, including its status and price. This needs closing.
- There is no timeline of events per booking.

## What changes
1. **One set of steps:** held → awaiting payment → paid → confirmed → stay done → payout released. Side paths: expired, declined, cancelled, needs attention. The guest Trips page and Admin show the same words for the same step.
2. **Hold, then pay:** picking dates and pressing Reserve holds the nights for 15 minutes, using the hold setting. The Paystack payment window comes from settings. If time runs out, the nights reopen automatically.
3. **No double booking:** the database refuses a second held, paid or confirmed booking on overlapping nights for the same local stay.
4. **Money saved per booking:** nightly breakdown, our fee (or the RayProp markup), and the host payout amount are stored when payment succeeds. Payouts use the stored amount, so changing the fee later doesn't change old bookings.
5. **Timeline:** every step writes an event: hold, payment received, confirmed, cancelled, refund, note, RayProp reply. Each event records who did it: guest, staff, system or RayProp. Admin → Bookings and Partner bookings show it as a timeline, and staff can add notes.
6. **Scheduler:** a job runs every 5 minutes. It expires unpaid holds, marks stays done after check-out, and releases payouts the day after check-in, using the payout-delay setting.
7. **Lock down editing:** guests and hosts can no longer edit booking rows directly. All changes go through the server's booking functions.

## Out of scope (later phases)
- Instant book vs host-accepts-in-24h and declines: Phase 7.
- Host portal: Phase 8.
- Payout admin tools: Phase 9.
- Full email set: Phase 21.

## Checks
- Tests for the step rules (allowed moves), the money split from settings, and expiry timing.
- Database tests: an overlapping booking is refused, and a guest can't edit a status.
- In the browser: hold a local stay, see the countdown, let it expire and confirm the nights reopen; then the admin timeline.
- A full paid booking still needs Paystack test keys. I'll say plainly if it isn't run.

## Technical details
- Migration: a `booking_status` check list, plus new columns `hold_expires_at`, `payment_expires_at`, `paid_at`, `confirmed_at`, `cancelled_at`, `nightly_breakdown jsonb`, `subtotal_kobo`, `fee_kobo`, `markup_kobo`, `host_payout_kobo`, `host_id`.
- Overlap rule: `btree_gist` exclusion on `(listing_id, daterange(check_in_date, check_out_date))` where the status is held, awaiting payment, paid or confirmed.
- New `booking_events` table, written only by security-definer `log_booking_event`. Guests can read their own events except staff notes; admins read all.
- Pure step-rule and money helpers go in `_shared/booking-core.ts`, with vitest tests.
- `paystack-init` creates the hold row. `paystack-verify` and the webhook move it to paid/confirmed and save the money split. `partner-fulfil-booking` writes events.
- `queue_payout_on_release` uses `host_payout_kobo` instead of total ÷ 1.08.
- Drop the guest/host UPDATE policy on bookings.
- `auto-release-escrow` becomes the 5-minute lifecycle job (pg_cron).
- Update AGENTS.md and roadmap.md.
