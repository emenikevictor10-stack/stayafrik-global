# Booking calendar: block taken dates (local + partner)

## Answer to your question
No — the calendar is **not** handled properly on either side today:

- **Your own listings:** the date picker only blocks past dates. It never looks at existing bookings, so two guests can pay for the same nights. The server (`paystack-init`) only checks the listing's on/off "available" switch — it never checks date clashes.
- **Partner (RayProp) stays:** the app has a working availability connection to RayProp, but the booking page never uses it. The calendar shows every future date as open. A guest only finds out dates are taken *after* picking them — when the quote or hold fails.

## What we'll build

### 1. Blocked dates on the calendar (both kinds of listing)
- When a guest opens the booking page, the app loads the taken date ranges and greys them out in the calendar — they can't be picked as check-in or check-out, and a range can't span a blocked night.
- **Local listings:** taken dates come from confirmed bookings for that listing (any status that holds the nights: confirmed, escrow-held, checked-in).
- **Partner stays:** taken dates come from RayProp's availability endpoint (already built server-side — just never called from the page).

### 2. Server-side double-booking protection (local)
- `paystack-init` re-checks for overlapping confirmed bookings before creating a payment. If the nights were just taken, the guest gets a friendly "Those dates were just booked — please pick different dates" message instead of paying.
- This closes the race where two guests pay for the same nights at the same time.

### 3. Partner stays keep their existing safety net
- The quote call already fails for unavailable dates and the hold returns "already held" — those errors already show friendly messages. Blocking dates up front just means guests rarely hit them.
- If RayProp's availability call fails, the calendar stays fully open and the quote/hold checks still protect the booking (partner outages stay invisible, per your rule).

### 4. Small touches
- A tiny "Dates in grey are taken" hint under the calendar.
- If a guest already picked dates that later become blocked, the dates reset with a gentle message.

## Technical details
- `src/pages/client/BookProperty.tsx`: fetch taken ranges on mount (local: `bookings` rows for `listing_id` with active statuses; partner: `raypropAvailability` for the visible months); pass a `disabled` matcher to the existing `Calendar` (react-day-picker supports range matchers); validate selections against blocked ranges.
- `supabase/functions/paystack-init/index.ts`: add an overlap query (`check_in < requested check_out AND check_out > requested check_in`) on active bookings before initializing payment; return 409 with a friendly message.
- Read-only access needed: guests must be able to read booked date ranges for a listing they don't own — add a narrow policy or a security-definer function returning only `check_in`/`check_out` (no guest data) for verified listings.
- Partner availability is cached briefly (a few minutes) so paging months doesn't spam the API.
- Tests: overlap-detection helper and blocked-range matcher get unit tests alongside the existing suites.

## Verification
- Create a test booking, reopen the same listing: those nights are greyed out.
- Try to pay for overlapping dates via a direct call: server refuses with the friendly message.
- Open a partner stay: unavailable dates from RayProp are greyed out; booking open dates still works end-to-end.
- Run the full test suite and type check.
