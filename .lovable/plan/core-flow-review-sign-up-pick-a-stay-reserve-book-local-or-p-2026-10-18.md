# Core flow review: sign up → pick a stay → reserve → book (local or partner)

## Verdict

The pieces are all built, but **the full flow has never been completed once**. The database has **0 bookings** (local or partner) and only 2 viewing reservations (1 approved, 1 pending). So nothing below "pay" is proven.

## Step by step

| Step | Local stay | Partner (RayProp) stay | Status |
|---|---|---|---|
| 1. Browse without account | Explore + listing page are open to visitors | Partner stays appear only after a search | Built (behind PIN gate wrapper; needs a signed-out check) |
| 2. Sign up | Google only, role pick, splash | same | Built |
| 3. Pick a stay | 123 live listings (9 hidden/unapproved) | 1,337 partner stays via search | Works |
| 4. Reserve for viewing (4h) | Host approves | **Not offered** (no local host) | Works for local; partner skipped by design |
| 5. Choose dates | Booked nights blocked | RayProp calendar blocked | Works |
| 6. Price / hold | Price + 8% fee | Quote → 15-min hold | Built, untested with real money |
| 7. Pay (Paystack) | `paystack-init` | `paystack-init` partner mode | Built, **never run** |
| 8. Confirm | Booking saved, host alerted | Reservation + wallet pay; failure → "needs attention" | Built, **never run** |
| 9. Escrow release | Hourly job is scheduled | n/a (RayProp pays hosts) | Scheduled, never exercised |

## Blockers, in order of severity

1. **No end-to-end test payment yet.** Needs one Paystack test-mode payment on a local stay and one on a partner stay. This needs you (or a tester) to pay with a Paystack test card.
2. **RayProp payment model + markup undecided.** Code assumes a prefunded RayProp wallet and markup = 0. If the wallet is empty, every partner booking will land in "needs attention" after the guest has paid.
3. **RayProp webhook registration unconfirmed.** Secrets exist; the one-time "Register webhook" in admin must be pressed and checked, otherwise partner booking status changes won't sync.
4. **Paystack key mode unknown** (test vs live). Must confirm before testing so no real money moves.

## Admin review against the flow

| Flow need | Admin page | Gap |
|---|---|---|
| Approve hosts' stays | Listings | OK; approve/reject doesn't log the listing ID |
| See bookings | Bookings / Partner bookings | OK, but empty — never shown real data |
| Fix failed partner bookings | Partner bookings (retry, wallet balance) | Untested |
| Refund a guest | none | **Missing** — only guests can cancel; admin can't refund/override |
| Release/hold host money | Payouts | No dispute hold |
| Viewing reservations | none | **Missing** — admin can't see 4h reservations |
| Fee / markup / policy settings | none | Hard-coded |
| Browse partner catalogue | none | Missing (offered earlier) |
| Place clean-up | Location audit | OK |

## Proposed plan

1. **Prove the flow (no code):** confirm Paystack is in test mode; check RayProp wallet balance and register webhook from admin; then run, in the preview, sign-up → local stay → reserve → book → pay with test card, and the same for a partner stay. Record every failure.
2. **Fix whatever step 1 breaks.**
3. **Admin gaps that block real operation:** admin refund/cancel action on a booking (uses existing `cancel-booking` rules), and a Reservations tab in admin.
4. Later (roadmap): settings page, dispute hold, partner catalogue page, listing-ID in audit log.

## What I need from you

- Is Paystack set to **test** keys right now?
- RayProp: prefunded wallet confirmed? Markup per night (₦)?
- Will you do the test-card payment, or should I drive it in the preview with Paystack's test card?

## Technical notes

- Verified: 0 rows in `bookings`; cron jobs `auto-release-escrow-hourly` and `refresh-location-counts` exist; secrets `PAYSTACK_SECRET_KEY`, `RAYPROP_API_KEY`, `RAYPROP_WEBHOOK_SECRET` set; `RAYPROP_MARKUP_PER_NIGHT_NAIRA` not set (defaults 0).
- Viewing reservation only renders when `p.hostId` exists, so partner stays never get it.
