# Booking confirmation details and reviews

## What booking emails share today
- **Your own stays:** the guest gets no confirmation email at all. Only the host is told ("A guest just booked ...").
- **Partner stays (just added):** the stay name, dates and booking reference. No address, no check-in time and no contact details.
- **Full address:** never sent by email. The listing page hides the exact address until the guest has booked.

## 1. Proper booking confirmation email (both kinds of stay)
Sent to the guest once payment is confirmed. It includes:
- Stay name, photo and listing ID
- **Full address** (street, neighbourhood, city, state) plus a "Get directions" map link
- Check-in and check-out dates and times
- Number of guests and nights
- Amount paid and booking reference
- Your own stays: host's first name and an in-app message button. No phone number, because hosts are messaged in the app only.
- Partner stays: RayProp's address and check-in time, if RayProp provides them; otherwise "Address will be sent before check-in". The StayGlobal support email is included.
- Cancellation policy summary and a "View my trip" button

If payment needs attention, the guest gets the "We're finalising your booking" email (no address) and receives the full email once the booking is confirmed.

The same full address also appears on the guest's trip page after booking.

## 2. Reviews
- **Leave a review:** after check-out, the guest gets an email and in-app prompt to rate (1 to 5 stars) and comment. Only real guests of finished stays can review, once per booking.
- **Show reviews:** your own stays show their reviews and update their star rating automatically.
- **Partner stays:** connect RayProp's reviews so partner stays show RayProp's reviews and rating. The first step is to confirm what RayProp's reviews data looks like; if they have no such data, partner stays show no reviews.
- **Admin → Reviews page:** search and filter by stay, rating and date; hide or restore an abusive review (hidden reviews don't count in the rating), with every action saved in the audit log.

## Technical
- New app email template `booking-confirmed` sent through `send-transactional-email`, called from `partner-fulfil-booking.ts` and the local booking path in `paystack-verify`. The idempotency key is the booking id. Run `setup_email_infra`/scaffold only if they are missing; the `notify.stayglobal.app` domain is already configured.
- Partner address and check-in time come from the RayProp listing or reservation response, stored on the booking (new nullable columns `partner_address` and `check_in_time`).
- Reviews: add `hidden boolean default false`; an RLS insert policy allows only the booking's guest after check-out; a trigger recalculates `listings.rating` and `reviews_count`. An hourly job queues review prompts (one per booking).
- RayProp reviews go through `rayprop-api`, cached with the catalogue and mapped in `rayprop-core.ts`.
