# Keep staff alerts (like "RayProp wallet is low") out of the guest app

## What I found
- The low-wallet alert goes only to accounts with the admin role. No guest receives it.
- Your admin accounts are also normal guest accounts, though. The guest bell shows every notification, so staff alerts appear in the customer view too.
- Only the admin Partner bookings page and the Health page can read the wallet balance. Guests never see the balance.

## Changes
1. **Mark staff alerts.** Admin-only alerts get their own type, `staff`, instead of `support`. This covers low wallet, stuck partner bookings, overdue issues and other alerts sent to admins. Existing alerts that link to `/admin...` are updated to the same type.
2. **Guest bell hides staff alerts.** The bell and its unread count leave out `staff` notifications when you're in the guest app.
3. **Admin area shows them.** The bell inside `/admin` shows staff alerts, so admins still get them there and by email.
4. **Guest-facing text stays generic.** I'll check partner-booking errors that guests can see (checkout, trip page, booking emails). Any mention of wallet or funds will be replaced with "We're confirming your booking with the host — we'll update you shortly."

## Technical
- Migration: change `notify_admins` to insert `type='staff'`, and backfill `update notifications set type='staff' where link like '/admin%'`.
- `NotificationsBell`: filter on `type <> 'staff'` outside `/admin`, and on staff alerts inside `/admin` (the count query too).
- Add a small test for the filter rule.
