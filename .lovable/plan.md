# PRD: StayGlobal launch readiness (end-to-end)

## 1. Summary
StayGlobal is a Nigerian shortlet marketplace. It mixes local host listings with RayProp partner stays, and guests pay through Paystack with escrow. Search, the calendar and checkout are built. What's missing before launch: proven money flows, refunds, guest notifications, WhatsApp alerts and full admin control. This PRD defines "launch ready" and sets it as a phased release.

Benchmark: RayShortlet, RayProp's own consumer marketplace. Its site would not render in a test browser, so the comparison uses standard marketplace expectations and the RayProp API. A manual screen-by-screen check is requirement R0.5.

## 2. Goals
- Every paid booking, local or partner, ends in a confirmed stay or a refund. No money gets lost.
- Guests and hosts hear about every important event by email, and hosts also on WhatsApp.
- Admins can see and control every naira: escrow, payouts, refunds and the partner wallet.
- No double bookings, and guests see clear policies before they pay.

Out of scope: native mobile apps, multi-currency, a loyalty programme.

## 3. Users
- **Guest:** searches, books, pays, cancels, gets receipts and reminders.
- **Host (agent):** lists, gets booking alerts, gets paid out, blocks dates.
- **Admin:** approves listings, handles refunds, payouts, disputes and partner bookings.

## 4. Current state
```text
Area                Status
Search / listings   Done (local + full RayProp catalogue on search)
Calendar            Done (2-month picker, blocked dates, server re-check)
Local booking/pay   Built (Paystack, escrow, auto-release), never tested live
Partner booking     Built, never run end to end against the sandbox
Admin               Listings, users, KYC, bookings, payouts, partner page
Guest emails        Missing (only host alerts and sign-in emails)
WhatsApp            Not built (number collected, nothing sent)
Refunds/cancel      Partner only; local stays cannot be cancelled
Settings            Fee and markup are fixed in the app, not admin-editable
```

## 5. Requirements

### Phase 0: Prove the money path (blocks launch)
- R0.1 Local booking end to end in Paystack test mode: pay, booking confirmed, escrow held, auto-release 24h after check-in, payout reaches the host's bank.
- R0.2 RayProp sandbox booking end to end: quote, hold, pay, reservation, wallet charge, status updated by webhook.
- R0.3 RayProp webhook registered from Admin > Partner bookings.
- R0.4 Auto-release and payout background jobs confirmed scheduled and running.
- R0.5 Manual side-by-side comparison with RayShortlet: search, listing page, checkout, confirmation.

Done when: both bookings complete with correct amounts in the database and in Paystack.

### Phase 1: Money and policy
- R1.1 Guests can cancel local stays. The policy is shown before payment and on the booking (default proposal: full refund 48h or more before check-in, 50% within 48h, none after check-in).
- R1.2 Refunds go through Paystack. The booking status moves to cancelled, then refunded, and an escrow-held booking is never released after cancellation.
- R1.3 Admin refunds: full or partial, with a required reason, written to the audit log.
- R1.4 Platform settings managed by the admin: service fee % (today 8%), RayProp markup per night (today ₦0), cancellation windows.
- R1.5 Reconciliation view: Paystack payments vs bookings vs payouts, with mismatches flagged.
- R1.6 Dispute hold: the admin can freeze escrow release on a booking.

### Phase 2: Notifications
Email (branded, sent from notify.stayglobal.app):
- Guest: booking confirmed (receipt, dates, address revealed), check-in reminder 24h before, cancellation or refund, viewing approved or declined, review request after checkout.
- Host: payout sent or failed, listing approved or rejected, booking cancelled.
- Admin: listing awaiting approval, partner booking needs attention, low partner wallet balance.

WhatsApp (needs a provider):
- Host: new booking, new message (with the same 30-minute limit as email), viewing request.
- Guest: booking confirmation and check-in reminder.
- Uses approved message templates. If WhatsApp fails, email still goes out.

### Phase 3: Booking flow polish
- Full address and check-in instructions shown only after payment (confirmation page and email).
- Printable receipt.
- Max guests per local listing, enforced at checkout.
- Calendar shows minimum stay and per-night prices (RayProp already sends these).
- Hosts can block dates on their own listings, and those dates show as taken for guests.

### Phase 4: Admin completeness
- Dashboard: gross bookings, escrow held, released, refunded, platform revenue, partner wallet.
- Moderate reviews and messages (hide abusive content).
- Settings page (see R1.4) plus policy text and support contacts.
- Export bookings, payouts and refunds to CSV.

### Phase 5: Launch hygiene
- Decide whether signed-out visitors can see local listings. The homepage is empty for them today.
- Fix the empty location icon on cards.
- Check the published site on phone, tablet and computer.
- Run the security scan again with nothing open.

## 6. Success metrics
- 100% of paid bookings reach confirmed, refunded or needs-attention, and are resolved within 24h.
- 0 double bookings.
- At least 95% of booking emails delivered. Host WhatsApp alerts arrive within 1 minute.
- Payouts are sent within 48h of check-in.

## 7. Risks
- RayProp wallet runs dry, so partner bookings fail after payment. Mitigation: low-balance alert plus the existing needs-attention retry.
- WhatsApp template approval delays. Mitigation: email covers every event on its own.
- Refund timing on Paystack (several days). Mitigation: clear copy telling guests what to expect.

## 8. Decisions needed from you
1. RayProp payment model (built for a prefunded wallet) and markup per night.
2. Cancellation policy for local stays (accept the default above?).
3. Service fee: keep 8%?
4. WhatsApp provider and business number (Twilio or Meta Cloud API).
5. Should local listings be public to signed-out visitors?

## 9. Technical notes
- New tables: `refunds` (booking, amount, reason, Paystack reference, actor), `platform_settings` (single row; the admin writes it, the app reads it), and a host date-blocks table, all with grants and RLS.
- New functions: `paystack-refund` (admin only, idempotent), `send-guest-email` (reuses the email queue and templates), `whatsapp-send` (provider key stored as a secret).
- Triggers on bookings and listings send the emails. The check-in reminder and review request run as scheduled jobs.
- paystack-init reads the fee and markup from `platform_settings`. Auto-release skips disputed or cancelled bookings.
- Vitest per money rule: fee %, refund windows, markup, blocked dates.
