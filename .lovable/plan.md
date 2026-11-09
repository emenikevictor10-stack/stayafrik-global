# Booking test from start to finish, paid by bank transfer

A full test run on the live app as a real guest and a real admin, using one of our own stays. No real money moves: I upload a test receipt instead of making a transfer.

## What I will test, in order
1. **Book:** open a stay, pick dates about 6 months ahead, choose "Pay by bank transfer" and tap "Get bank details". Check that the dates are now blocked for other guests.
2. **Transfer page:** check that it shows FCMB, 4460545012, EZEKIL BASSEY, the right amount, a reference and the countdown. Then type a sender name, upload a receipt and tap "I've paid".
3. **Trip page:** check that it shows "Payment being checked" and that the guest gets a bell alert.
4. **Admin:** open Bank transfers and check the menu count, the row and the receipt preview. Approve the transfer.
5. **After approval:** check that:
   - the booking is confirmed
   - the guest gets a bell alert and email, and the confirmation email has the address and check-in details
   - the host gets an alert
   - the booking timeline and audit log show each step
   - the stay shows in the host portal
6. **After the stay:** move the test booking's dates into the past and run the daily booking update. Check that the money is released to the host and a payout is created, and that the review request goes out.
7. **Cancellation:** make a second booking and approve it, then cancel it as the guest. Check that the refund amount follows the policy (100% if 48+ hours before check-in).
   - Bank-transfer refunds can't go back through Paystack, so I'll check how this is shown and report it.
8. **Reject and expiry:** make a third booking, reject it with a reason, and check that the dates free up and the guest is told why. Then make a fourth that never gets a receipt, and check it shows as expired after its time limit (I'll shorten the time for the test).

## What you get
A clear pass/fail list for each step, with screenshots for the screens. Anything broken gets fixed in the same pass and re-tested. Afterwards, all test bookings, alerts and payouts are deleted.

## Notes
- Emails: I can confirm they were queued and sent by our email system. I can't open your inbox.
- Partner (RayProp) stays are not included, because approving one makes a real booking and charges our RayProp prepaid account. That needs your go-ahead separately.
- The test uses your signed-in account as both guest and admin. The host is the owner of the stay I pick.
