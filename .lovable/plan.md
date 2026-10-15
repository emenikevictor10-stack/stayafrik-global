# Listing IDs for tracking (local + RayProp)

## Goal
Every listing has a short, readable ID that staff can use to trace activity (bookings, payouts, reviews, messages, admin actions) in the admin area.

- **Local listings:** get a new code in the format **SG + 4 digits + 2 letters**, e.g. `SG2345LT`. Your example `SG234LT` has 3 digits, so this plan uses 4 digits, as your text says. Every code is unique and never changes.
- **RayProp listings:** keep RayProp's own listing ID (e.g. `1C1F9KRZ`) and record it on every booking, quote, hold, cancellation and webhook event.

## What changes
1. **Codes for all local listings**
   - Each new listing gets a code automatically when it's created.
   - Every existing listing gets a code too, in a one-time fill.
   - Codes are unique. If a random code is already taken, the system draws another one.
2. **RayProp listing ID recorded everywhere**
   - Partner bookings already save the RayProp listing ID. We'll also save it on the partner booking-attention record and the payment details, and match it on webhook events. Today only the reservation ID is matched.
   - The quote, hold and cancel calls will log the listing ID along with any error.
3. **Where staff see it**
   - Admin listing approvals, bookings, partner bookings, payouts and user detail pages show the code: `SG2345LT` for local stays, `RP·1C1F9KRZ` for partner stays.
   - Admin search accepts either kind of code.
   - Guests see the code small on the listing page and on their booking receipt ("Listing ID"), so support can quote it.
   - **RayProp listings show their RayProp listing ID on the listing details page.** It sits in the "Good to know" section as "Listing ID: RP·1C1F9KRZ", and staff can tap to copy it.
5. **Cleaner admin area**
   - Consistent page headers: a title, one line of description, and actions on the right.
   - Tables become tidy cards on smaller screens, with even spacing and clear status pills (Pending / Approved / Rejected / Needs attention).
   - The listing approvals page gets a compact list on the left and the selected listing's details on the right on computers, with Approve / Reject pinned at the bottom.
   - A search box and status filters at the top of each list page.
   - Clear empty states and loading skeletons instead of blank areas.
4. **Activity tracking**
   - Admin audit log entries for listing actions (approve, reject, revoke, edit) record the listing code.
   - Bookings keep a copy of the listing code, so the history still reads correctly if a listing is later deleted.

## Technical details
- Migration: add `listings.listing_code text UNIQUE`. Add a `public.generate_listing_code()` function that loops until it finds a free code matching `^SG[0-9]{4}[A-Z]{2}$`. A BEFORE INSERT trigger sets the code when it's empty. Existing rows are backfilled, then the column is set NOT NULL in a later migration.
- Migration: add `bookings.listing_code text` (nullable). A BEFORE INSERT trigger copies it from the listing for local bookings. For partner bookings it is `RP-<rayprop_listing_id>`. Existing bookings are backfilled.
- `paystack-init` / `paystack-verify`: add `rayprop_listing_id` to the payment details and pass it into the booking insert. `rayprop-webhook`: fill in `rayprop_listing_id` from the event when it's missing.
- `rayprop-api`: add `listing_id` to error logs for quote, hold and cancel.
- Frontend: map `listing_code` onto Property (local), and show the code for partner stays. Show it in the admin pages and the admin search filter, in PropertyDetail and in BookingConfirm.
- Tests: the code format check (pattern) and how a partner code is built.
