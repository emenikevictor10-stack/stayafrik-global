# PRD: Partner listings and your own listings, both bookable in one app

## 1. Goal

Guests browse one feed on Explore. Each card is either one of **your own listings** (from your hosts) or a **partner listing** (from RayProp). Both look the same, open the same detail page, and are booked and paid through the same Paystack checkout. Your own listings keep working exactly as they do today, even when RayProp is switched off or not responding.

## 2. Where things stand

- **Already done (built during the last approved plan):** the server-side helpers that talk to RayProp. They now use the correct `x-api-key` sign-in, read prices in kobo, give friendly error messages (for example "those dates were just taken"), and cover availability, quotes, holds, reservations, cancelling, paying from your RayProp wallet, registering the webhook and checking the wallet balance. Webhook signature checking is ready and testable.
- **Not done yet:** everything listed in sections 4–8.
- **Blocked:** your RayProp API key, your webhook secret, and your markup. Until the key is added, the app shows only your own listings, with no errors.

## 3. Listing card fields: how partner data fills them

Every card field is filled from the documented RayProp fields, so partner cards look exactly like your own.

| Card / detail field | Your own listing | Partner listing (RayProp) |
|---|---|---|
| id | listing id | `rp_` + `id` / `unique_listing_id` |
| title | title | `title` |
| location (broad) | city / area | `neighborhood`, `city` |
| price / night | price_per_night | `price_per_night` divided by 100 (kobo to Naira) |
| photos | images | `listing_images[].image_url` (main photo first) |
| bedrooms / bathrooms | bedrooms / bathrooms | `bedrooms` / `bathrooms` |
| max guests | (new, optional) | `max_guests` |
| area | area | `property_size_sqm` + " sqm" |
| amenities | amenities | `amenities` + `building_amenities` |
| rating / reviews | rating / reviews_count | `rating` / `reviews_count` (0 if missing) |
| description | description | `description` |
| check-in/out time, house rules | none | `check_in_time`, `check_out_time`, `house_rules` |
| map | broad circle until paid | broad circle around the neighbourhood (RayProp doesn't share exact addresses) |
| badge | "Verified Host" | "Verified Partner" |
| host | host name and avatar | "RayProp Partner" (no in-app chat with partner hosts) |

**CHANGES EXISTING:**
- The partner data reader gets rewritten to use these exact fields and the kobo conversion. It currently guesses the fields, so prices would show 100x too high.
- The listing details gain three optional fields: max guests, check-in/out time and house rules. The detail page shows them when they're present, and your own listings are unaffected.

## 4. Browsing (Explore)

- Partner listings are fetched on the server for Lagos, Abuja and Port Harcourt (the cities RayProp covers), 10 per city. They're cached for 10 minutes so we stay within RayProp's usage limits.
- Partner and local listings are shown mixed together, newest first. Filters (city, type, price, bedrooms) apply to both.
- If RayProp fails or is switched off, only local listings show, with no error.
- **CHANGES EXISTING:**
  - Remove Enugu and Ibadan from the partner city list.
  - Stop showing partner listings first; mix them into the feed instead.
  - Opening a partner listing directly from a shared link fetches it from RayProp, instead of only from the guest's last viewed card.

## 5. Booking flow

The same three-step checkout works for both. The steps differ behind the scenes:

```text
LOCAL:    dates -> guests -> review (price from listing) -> Paystack -> booking confirmed
PARTNER:  dates (taken days greyed out) -> guests + contact details
          -> quote (price locked 30 min, VAT shown) -> hold (dates blocked 15 min, countdown)
          -> Paystack -> server: reservation + pay from wallet -> booking confirmed
```

- **Partner step 2** asks for name, phone and email, pre-filled from the guest's profile. RayProp requires these.
- **Partner price breakdown:** nightly rate × nights, then your markup, then 7.5% VAT, then the total. The 8% service fee is not added on partner stays, because the markup is your earnings there.
- **If the hold expires** before payment: "Your hold expired — get a new price" re-runs the quote.
- **CHANGES EXISTING:**
  - The booking page gets a partner branch with the extra contact step, the countdown and the VAT breakdown.
  - Starting a Paystack payment learns a partner mode. In that mode the server re-reads the quote from RayProp and charges that amount, never trusting the browser.
  - Confirming a Paystack payment learns a partner mode. After Paystack succeeds, the server creates the RayProp reservation, pays for it from your RayProp wallet (one attempt per payment) and saves the booking with source "rayprop". If any RayProp step fails after payment, the booking is saved as "needs attention" and admins are alerted for a refund or retry. The guest is never left paid with nothing on record.

## 6. After booking

- **My Bookings** shows both kinds. Partner bookings show the property title and photo saved at booking time.
- **Cancel:** partner bookings use RayProp's cancel endpoint and its refund policy (shown to the guest before they confirm). Local bookings keep today's rules.
- **Status updates:** the RayProp webhook updates partner bookings: booked/paid become confirmed, cancelled becomes cancelled, completed becomes completed. Duplicate events are ignored.
- **CHANGES EXISTING:**
  - The webhook handler gets rewritten to use the documented signature format.
  - The "release funds to host" escrow action is hidden for partner bookings, because RayProp pays its own hosts.
  - Host booking alerts skip partner bookings, which have no local host.

## 7. Admin

- A new "Partner bookings" page lists partner reservations with their RayProp status, any that need attention (with a retry button), and your RayProp wallet balance with a low-balance warning.
- A one-time "Register webhook" button.

## 8. Data changes (CHANGES EXISTING: bookings)

The bookings table gains these columns:
- partner title, photo and city, saved at booking time
- quote total (in kobo)
- hold expiry time
- guest count
- a "needs attention" reason

A new partner events log stores webhook event ids so duplicates are ignored (admin-only access). Your existing bookings are unaffected.

## 9. Testing

Automated tests for:
- the kobo-to-Naira conversion
- the partner-to-card field mapping
- the webhook signature check (valid and tampered)
- event-to-status mapping
- price total = (rate + markup) × nights + 7.5% VAT

Then a full test booking with a RayProp sandbox key and Paystack test mode, once the key is added.

## 10. What I need from you

1. **RayProp API key** (sandbox first, then live) — I'll open a secure form.
2. **Webhook secret** — the form has a Generate button; you paste the same value into RayProp.
3. **Payment model:** I'm building for "prefunded wallet" (keep a balance in your RayProp wallet). Confirm, or tell me otherwise.
4. **Markup per night** in Naira (0 if none).

## Technical details

- Edge functions: `_shared/rayprop.ts` and `rayprop-core.ts` (done); `rayprop-api` (add availability, get_listing, cancel, admin wallet/register-webhook with admin role check, 10-minute cache); `rayprop-webhook` (signature check in constant time, dedupe table); `paystack-init` and `paystack-verify` (source branch).
- Frontend: `src/lib/rayprop.ts`, `useListings.ts` (field mapping, mixing), `data/properties.ts` (optional fields), `BookProperty.tsx`, `BookingConfirm.tsx`, `Bookings.tsx`, `PropertyDetail.tsx`, a new `AdminPartnerBookings.tsx`.
- The `notify_on_booking` trigger already exits when listing_id is null; this needs checking during the build.
- Tests live in `src/test/rayprop.test.ts`.
