# Updated launch readiness report (v2 PDF)

Create a new downloadable report, saved as a separate v2 file. The original stays as it is.

## What the report will cover
1. **Verdict:** not ready to go live yet, with today's figures (132 local stays, about 1,337 partner stays, 0 bookings, 0 payouts, 0 reviews).
2. **Feature status table:** every feature marked as working, partly working or not working.
3. **Money:** how guest payments, the 8% fee, escrow, host payouts and refunds behave today, and where they can go wrong. This includes host bank details not being saved fully and Paystack being on live keys.
4. **Blocked dates, in every layer:** local bookings, host date blocks, RayProp availability, sending blocks to RayProp, showing blocks on the calendar, and stopping two guests from paying for the same nights.
5. **Paystack safety, security and stability:** the minimum needed before launch, including test keys, the webhook check, duplicate-payment protection, refunds and a stress test plan.
6. **Full redesign:** an Airbnb-standard look and feel, in phases.
7. **Budget:** cost of each part, with the 100% buffer applied for a total of **200–300 credits**. These are rough estimates, not platform pricing.
8. **Decisions needed:** Paystack test keys, RayProp wallet funding and markup, and when hosts get paid (at check-in or check-out).

## Checks
- I'll turn every page into an image and look for cut-off text, overlaps and broken tables. Any problems get fixed before I send it.

## Technical
- Generate with the existing HTML→PDF script in /tmp, using the Stay logo and brand colours. Output: `/mnt/documents/StayGlobal_Launch_Readiness_Audit_v2.pdf`. No app code changes.
