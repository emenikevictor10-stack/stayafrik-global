# Partner stay payment: step-by-step review and fixes

## What happens today, step by step
1. **Price and hold.** The guest picks dates and guests and enters name, email and phone. The app gets a price from RayProp, then a 15-minute hold that keeps the stay for them.
2. **Pay button.** Before Paystack opens, the server checks again with RayProp that the price and hold are still valid. If the hold has run out, the guest sees "Your hold expired. Please get a new price." The server sets the amount itself; the guest's screen can't change it.
3. **Paystack pop-up.** The guest pays. If they cancel, they see "Payment cancelled" and nothing is saved.
4. **Confirmation page.** When payment succeeds, the browser goes to the confirmation page, which asks the server to check the payment.
5. **Server checks with Paystack.** It confirms the payment went through, belongs to this guest, and is for the exact amount. If a booking with this payment already exists, it simply shows that booking.
6. **Book with RayProp.** The server creates the RayProp reservation from the hold and pays for it from the RayProp wallet.
7. **Saved.** The booking is saved with the stay's details and RayProp numbers:
   - Everything worked: **Confirmed**.
   - Any RayProp step failed (empty wallet, hold expired, RayProp down): **Needs attention**, with the reason. It shows under Admin → Partner bookings.
8. **Later updates.** RayProp sends updates (cancelled, checked in and so on). These change the booking's status only if the webhook has been registered.

## Gaps found
1. **Guest closes the page right after paying:** the confirmation page never loads, so no booking is saved, even though the money was taken. This breaks the rule that a paying guest always has a booking.
2. **Saving fails after RayProp has booked:** the RayProp reservation exists but there is no booking record and no error is logged.
3. **Hold runs out while paying:** the 15-minute hold can expire inside the Paystack pop-up. The booking then lands in Needs attention with no clear message to the guest.
4. **No alerts:** nobody is told about a Needs attention booking. The guest gets no confirmation email for partner stays, and admins get no alert.
5. **Not proven:** this flow has never run with a real or test payment. The RayProp wallet balance, the markup and the webhook registration are still unconfirmed.

## Fixes
1. Paystack also tells the server about each successful payment directly, so the booking is saved even if the guest closes the page. It uses the same steps as the confirmation page and never creates a booking twice.
2. Save the booking as "processing" first, before booking with RayProp, then update it. A failure can never leave a RayProp reservation without a record.
3. Show a countdown of hold time on the pay step. Block payment when less than 2 minutes are left and ask the guest to get a fresh price.
4. Emails:
   - Confirmed: the guest gets "Booking confirmed".
   - Needs attention: the guest gets "We're finalising your booking" and every admin gets an email with the reason.
5. The confirmation page shows a friendly "finalising" message instead of an error when a booking needs attention.

## Technical
- New `paystack-webhook` function: checks the `x-paystack-signature` HMAC with the secret key and handles `charge.success`. The fulfilment logic moves into `_shared/partner-fulfil-booking.ts`, and `paystack-verify` and the webhook both call it. Duplicates are prevented by the unique `payment_reference` (add a unique index if one is missing).
- Insert-first flow: insert with status `processing`, call `fulfilRayProp`, then update. `paystack-verify` re-runs fulfilment when it finds a booking stuck in `processing`.
- Emails go through the existing `send_alert_email` / email queue.
- The webhook URL is registered once in Paystack's settings (the user does this).
