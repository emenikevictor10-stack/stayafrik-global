# Booking calendar: one 2-month range modal with blocked dates (local + partner)

## Answers to your questions
- **Is the calendar handled properly today? No.** The date picker only blocks past dates. Your own listings never check existing bookings (two guests can pay for the same nights), and partner stays never show RayProp's availability — guests only learn dates are taken when the quote or hold fails.
- **How does RayProp handle it?** Their availability endpoint returns every day in a date range as `{ date, available, price_per_night, minimum_stay }` — confirmed live just now. That's exactly what a 2-month calendar needs, and our server already has the connection built; the booking page just never calls it.

## What we'll build

### 1. One date modal, two months side by side
- Replace the separate "Check-in" / "Check-out" pickers with a single "Select dates" field.
- Tapping it opens one modal showing **two months at a time** (side by side on computer/tablet, stacked on phone), with prev/next month navigation.
- Guest taps check-in date, then check-out date; the selected range highlights between them. The field shows "Fri, 20 Nov → Sun, 23 Nov · 3 nights".

### 2. Blocked dates visible in the modal
- Taken dates are greyed out and can't be selected; a range can't span a blocked night (if the guest picks a check-in before a blocked date, check-out options stop at it).
- **Local listings:** taken dates come from confirmed/active bookings for that listing.
- **Partner stays:** taken dates come from RayProp's per-day availability (`available: false`), fetched for the visible months and cached a few minutes so paging months doesn't spam the API.
- A small legend: "Greyed dates are taken".

### 3. Server-side double-booking protection (local)
- `paystack-init` re-checks for overlapping active bookings before creating a payment; if the nights were just taken, the guest gets "Those dates were just booked — please pick different dates" instead of paying.

### 4. Safety nets stay
- Partner quote/hold already fail gracefully on unavailable dates; blocking up front means guests rarely hit those errors.
- If RayProp's availability call fails, the calendar opens fully and quote/hold still protect the booking — no error shown to guests.

## Technical details
- `src/pages/client/BookProperty.tsx`: replace the two `DateField` pickers with one range field + modal; use the existing shadcn `Calendar` in range mode with `numberOfMonths={2}` and a `disabled` matcher built from blocked ranges; add `pointer-events-auto` inside the modal.
- New hook `src/hooks/useBlockedDates.ts`: local → query active `bookings` for the listing; partner → `raypropAvailability(listing_id, from, to)` per visible month pair, merged into a `Set` of blocked ISO dates.
- Read access: a security-definer function returning only `check_in`/`check_out` ranges for a listing (no guest data), so guests can see taken nights without seeing who booked.
- `supabase/functions/paystack-init/index.ts`: overlap check (`check_in < requested check_out AND check_out > requested check_in`) on active bookings → 409 with friendly message.
- Tests: blocked-range matcher and overlap-detection helper unit tests alongside the existing suites.

## Verification
- Book a local listing, reopen it: those nights are greyed in the modal.
- Direct server call with overlapping dates: refused with the friendly message.
- Partner stay: RayProp-unavailable days are greyed; booking open dates still works end-to-end.
- Modal shows 2 months on phone, tablet and computer; full test suite and type check pass.
