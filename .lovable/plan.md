# StayGlobal launch readiness: what's left to make it work end to end

RayShortlet would not load in a test browser. It's a single-page app that never finished rendering, and its source only shows branding and redirect code. So this comparison uses what a working shortlet marketplace like RayShortlet needs, plus what the RayProp API offers. The first item in Phase 0 is a manual side-by-side check.

## Status today

```text
Area                Status
Search / listings   Done (local + full RayProp catalogue on search)
Calendar            Done (2-month picker, blocked dates, server re-check)
Local booking/pay   Done (Paystack, escrow, auto-release), not tested live
Partner booking     Built, never run against sandbox end to end
Admin               Listings, users, KYC, bookings, payouts, partner page
Guest emails        Missing (only host alerts and sign-in emails exist)
WhatsApp            Not built (number is collected, nothing is sent)
Refunds/cancel      Partner only; local stays have no cancel or refund
```

## Phase 0: Prove the money path (blocking)
1. Run a full local booking with Paystack test mode: pay, booking confirmed, held in escrow, auto-release, payout to the host's bank.
2. Run a full RayProp sandbox booking: quote, hold, pay, reservation, wallet charge, webhook updates the status.
3. Register the RayProp webhook from Admin > Partner bookings.
4. Confirm the auto-release and payout background jobs are actually scheduled and running.
5. Compare StayGlobal and RayShortlet screen by screen by hand (search, listing page, checkout, confirmation).

## Phase 1: Money and policy gaps
- **Cancellation and refunds for local stays.** Guests can cancel, a clear policy is shown (for example, full refund 48h or more before check-in), Paystack refunds run from the admin side, and the booking gets "refunded" or "cancelled" status.
- **Admin refunds page.** Issue a full or partial refund with a reason, and record it in the audit log.
- **Platform fee and markup settings.** The admin sets the service fee and the RayProp markup per night, which is ₦0 today.
- **Reconciliation view.** Paystack payments vs bookings vs payouts, with mismatches flagged.
- **Disputes and holds.** The admin can freeze escrow release on a booking.

## Phase 2: Notifications (email first, then WhatsApp)
- Guest emails: booking confirmed (receipt, dates, address revealed), reminder 24h before check-in, cancellation or refund, viewing approved or declined, review request after checkout.
- Host emails: payout sent or failed, listing approved or rejected (today these are in-app only).
- Admin emails: new listing awaiting approval, partner booking needs attention, low wallet balance.
- **WhatsApp:** send host alerts (new booking, new message) and the guest booking confirmation through WhatsApp Business. This needs a provider account (for example Twilio or Meta Cloud API), approved message templates, and an API key from you.

## Phase 3: Booking flow polish
- Show the full address and host check-in instructions only after payment, on the confirmation page and in the email.
- Downloadable or printable receipt.
- Guest count limit per listing (local listings have no max-guests field yet).
- Minimum stay and per-night price changes on the calendar (RayProp already sends these).
- Hosts can block dates on their own listing calendar.

## Phase 4: Admin completeness
- Dashboard numbers: gross bookings, escrow held, released, refunded, partner wallet.
- Moderate reviews and messages (hide abusive content).
- Settings page: fees, markup, policy text, support contacts.
- Export bookings and payouts to CSV.

## Phase 5: Trust and launch hygiene
- Decide whether signed-out visitors can see local listings. The homepage is empty for them today.
- Fix the empty location icon on cards.
- Re-check the published site on phone, tablet and computer.
- Run the security scan again before launch.

## Decisions needed from you
1. RayProp payment model (built for a prefunded wallet) and markup per night.
2. Cancellation policy for local stays.
3. Your service fee: keep 8%?
4. WhatsApp provider: do you have a WhatsApp Business account?
5. Should listings be public to signed-out visitors?

## Technical notes
- New tables: `refunds`, `platform_settings` (single row; admin writes, everyone reads).
- New functions: `paystack-refund`, `send-guest-email` (reuses the email queue), `whatsapp-send`.
- Triggers on bookings and listings call the email helper. Reminders run as a scheduled job.
- Each money rule (fee, refund window, markup) gets a vitest next to the existing tests.
