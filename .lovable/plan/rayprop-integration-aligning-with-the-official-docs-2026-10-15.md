# RayProp integration: aligning with the official docs

I read the RayProp API docs and compared them with what's already built. The basic structure (a secure server-side connection, partner listings on Explore, a webhook) is fine. But several details were built from guessed instructions and **will fail against the real API**. The items marked **CHANGES EXISTING** below rework code that's already there.

## What the docs say (key facts)

- Base URL: `https://api.rayprop.io/functions/v1/complete-api` (already correct).
- Authentication uses an `x-api-key` header, not `Authorization: Bearer`. (I confirmed this: the live API rejects requests without `x-api-key`.)
- All money values are in **kobo** (divide by 100 to get Naira). A 7.5% VAT is added on top of RayProp's price plus your markup.
- Responses look like `{ success, data, meta: { page, limit, returned, hasMore } }`. Errors look like `{ success:false, error:{ code, message } }`.
- A **quote** locks the price for 30 minutes. A **hold** blocks the dates for 15 minutes; the API returns 409 if the dates are already held.
- A **reservation** starts as `awaiting_host`. How it becomes `booked` depends on your RayProp account's payment model:
  - `prefunded_wallet`: you call `POST /reservations/:id/confirm-payment`, which takes the money from your RayProp wallet.
  - `rayprop_collects`: RayProp sends payment instructions and collects the money itself.
  - `partner_collects`: you collect the money, and the reservation stays `pending_funding` until your wallet is topped up.
- Webhooks: you register them with `POST /webhooks` (url, events, secret). The signature arrives in the `X-RayProp-Signature: sha256=<hex>` header and is computed over `{_meta.timestamp}.{rawBody}`. Events: `reservation.created`, `.payment_confirmed`, `.booked`, `.cancelled`, `.checked_in`, `.completed`.
- Other endpoints: `/availability`, `GET /quotes/:id`, `GET /holds/:id`, `POST /reservations/:id/cancel`, `GET /reservations/:id/payment-status`, plus wallet and usage endpoints.
- There are separate sandbox and live keys (`rp_live_...`). Quotes cost 1.5x and reservations 2x against your rate limit.

## Changes to what already exists

1. **CHANGES EXISTING: how the server signs in to RayProp.** Switch from `Authorization: Bearer` to `x-api-key`. Read errors in the `error.message` shape and show 409 as a friendly "those dates were just taken" message.
2. **CHANGES EXISTING: prices on partner cards.** Convert kobo to Naira everywhere a RayProp price is shown (cards, quote, checkout). Without this, prices would show 100x too high.
3. **CHANGES EXISTING: reading listings.** Use the documented fields (`price_per_night`, `neighborhood`, `listing_images[].image_url` with `is_primary`, `max_guests`, `check_in_time`, house rules, amenities). Partner listings will show the neighbourhood only, which matches the existing rule of hiding the exact location until payment.
4. **CHANGES EXISTING: the webhook.** Fix the signature check to read the `X-RayProp-Signature` header, use the `{timestamp}.{rawBody}` format and compare in constant time. Map events to booking statuses: booked/payment_confirmed become confirmed, cancelled becomes cancelled, completed becomes completed. Ignore duplicate events.
5. **CHANGES EXISTING: the booking flow (BookProperty + paystack-verify).** The real sequence will be: quote, then show the price with VAT, then hold (with a 15-minute countdown shown), then Paystack payment, then reservation, then a step that depends on your payment model (see the question below), then save the booking with `source: "rayprop"`. If the hold expires before payment, the guest gets a new quote. The server will also reject a payment whose amount doesn't match the quote.
6. **CHANGES EXISTING: the Paystack payment check.** The reservation step currently runs in the browser after payment. It will move into the server-side payment check, so a guest who closes the tab mid-way doesn't end up paid but unbooked.

## New additions

- Check availability (`/availability`) before quoting, so taken dates are greyed out on the calendar.
- Guests can cancel a partner booking from My Bookings (`POST /reservations/:id/cancel`), following the refund rules.
- A one-time admin action that registers the webhook URL with RayProp (`POST /webhooks`).
- An admin "Partner bookings" view showing RayProp reservation status, plus the wallet balance if you use the wallet model.
- A small test that checks the kobo-to-Naira conversion and the webhook signature check.

## What I need from you

- **RAYPROP_API_KEY**: use a sandbox key first, then live.
- **RAYPROP_WEBHOOK_SECRET**: you'll choose this value; I'll open a secure form with a Generate button.
- **Your RayProp payment model**: since guests already pay you through Paystack, `prefunded_wallet` fits best. You keep a balance in your RayProp wallet, and the app confirms each booking from it right after Paystack succeeds. I'll build for that unless you tell me otherwise.
- **Your markup**: whether you add a fee on top of RayProp's price, and how much.

## Technical details

- Files: `supabase/functions/_shared/rayprop.ts`, `rayprop-api/index.ts`, `rayprop-webhook/index.ts`, `paystack-init`, `paystack-verify`, `src/lib/rayprop.ts`, `src/hooks/useListings.ts`, `BookProperty.tsx`, `BookingConfirm.tsx`, `Bookings.tsx`, plus a new admin page.
- Database: add `rayprop_hold_expires_at`, `rayprop_quote_total_kobo` and a `rayprop_events` table (event id, to ignore duplicates; admin-only access) to bookings.
- `paystack-init` will charge the quote total (converted from kobo) for RayProp bookings, instead of looking up a local listing.
