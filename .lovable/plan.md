# MVP check: does StayGlobal work end to end?

## Short answer
**Not yet.** Everything is built, but no booking has ever gone all the way through. Checked today: 0 bookings (local or partner), 0 payouts, 0 reviews, and only 2 viewing requests. Right now this is a *finished build that hasn't been proven*, not a working MVP.

## Where each step stands
| Step | Status |
|---|---|
| Browse, search, partner stays in results | Works (checked) |
| Sign in with Google, become a host | Works |
| Host lists a stay, admin approves | Works (132 listings) |
| Ask for a viewing (4h) | Works (2 requests) |
| Pick dates, booked nights blocked | Works |
| Pay with Paystack (local stay) | Built, **never run** |
| Pay with Paystack (partner stay) | Built, **never run** |
| Booking confirmed + emails | Built, **never run** |
| Host paid after the stay | Built, **never run** |
| Guest cancels and gets a refund | Built, **never run** |
| Guest leaves a review | Built, none yet |

## What stands between you and MVP
1. **One test booking on your own stay** with a Paystack test card: pay, see the confirmation, see it in Admin → Bookings, release it, see the host payout.
2. **One test booking on a partner stay**: same, then check Admin → Partner bookings.
3. **Things only you can confirm:**
   - Paystack is on **test** keys (so no real money moves).
   - The Paystack webhook address is saved in your Paystack settings.
   - Your RayProp wallet has money in it (otherwise partner bookings land in "needs attention" after the guest pays) and the per-night markup you want.
   - The RayProp webhook is registered from Admin → Partner bookings.
4. **One cancellation test** to prove refunds.

Once 1, 2 and 4 pass, you can honestly call it an MVP.

## Plan
1. You confirm the items in point 3.
2. I drive both test bookings and a cancellation in the preview with Paystack's test card, signed in as a real account, and note every failure.
3. I fix whatever breaks and run them again until both pass.
4. I report back with what passed and what money moved where.

Not needed for MVP (later): settings page for fee/markup, dispute hold, partner refunds in-app, WhatsApp.
