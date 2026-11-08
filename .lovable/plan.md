# Phase 6 recheck + Phase 7: Host prices and calendar

## Phase 6 recheck (done live just now)
- Confirmed in place: no-double-booking rule, status checks and timeline logging, hourly lifecycle job, and guests can only read (not edit) bookings.
- Gap found: hosts currently cannot see bookings for their own stays (only guests and admins can read them). Fix this as step 1 of Phase 7, since the calendar needs it.
- Still unproven: a real paid booking (needs Paystack test keys). No bookings exist yet, so this stays an open item, not a code gap.

## Phase 7: what hosts will be able to do (local stays only)
1. **Prices**: set a weekday price, an optional weekend price (Fri and Sat nights), and special prices for chosen dates.
2. **Fees and discounts**: optional cleaning fee (charged once per stay), weekly discount (7+ nights) and monthly discount (28+ nights).
3. **Stay length**: minimum and maximum nights.
4. **Blocked dates**: block or unblock dates for their own use or maintenance. Guests see these as unavailable.
5. **Booking mode**: Instant book (as today) or Request to book. In request mode the guest pays, the booking waits for host approval for 24 hours (from settings), and if the host declines or doesn't answer, the guest gets a full automatic refund.
6. **Calendar import (iCal)**: paste an Airbnb/Booking.com calendar link; busy dates are pulled in every hour and shown as blocked.
7. **Guest side**: the date picker greys out blocked, booked and imported dates and enforces min/max nights; the checkout shows the night-by-night breakdown, cleaning fee and discount. The server recalculates the same price at payment (the screen is never trusted).
8. **Where hosts edit this**: a new "Prices and calendar" section on each listing (simple month view plus a settings form). The full host portal comes in Phase 8.

## Out of scope
Host portal pages (Phase 8), payout admin (Phase 9), partner (RayProp) stays — they keep RayProp's own prices and availability.

## Checks before closing
- Tests for each pricing rule: weekend price applies on Fri/Sat nights only; date price overrides both; weekly/monthly discount thresholds; cleaning fee once; min/max nights refused.
- Request-to-book: approve confirms; decline and 24h timeout refund in full.
- Blocked and imported dates refused both in the picker and at payment.
- Browser check of host calendar and guest checkout on phone and PC.

## Technical details
- Migration: listing columns `weekend_price`, `cleaning_fee`, `weekly_discount_pct`, `monthly_discount_pct`, `min_nights`, `max_nights`, `booking_mode` ('instant'|'request'), `ical_url`; new tables `listing_date_prices` (listing_id, date, price), `listing_blocks` (listing_id, start, end, source 'host'|'ical', note) with grants + RLS (host owns, admin all, public read of busy ranges via `listing_booked_ranges`).
- Host SELECT policy on `bookings` where `host_id = auth.uid()`.
- New statuses `awaiting_host` → confirmed / declined in `booking-core.ts` and `booking_status_guard`; `host_booking_action` RPC; lifecycle tick expires overdue requests and triggers refund through the existing cancel/refund path.
- Pure pricing in `_shared/booking-core.ts` (`quoteLocalStay`) used by `paystack-init` and the client; extend `listing_booked_ranges` to include blocks.
- `ical-sync` edge function + hourly cron; parse VEVENT DTSTART/DTEND only.
