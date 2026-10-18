# How "Reserve for viewing" works today, and suggested fixes

## How it works now

```text
Guest on a listing page -> "Reserve for viewing (4h hold)"
  -> (signed out? sent to sign in first)
  -> dialog: preferred visit time (optional) + message to host (optional) -> "Send request"
  -> request saved as "pending"
  -> host gets an in-app notification + email "New viewing request"
Host opens Reservations -> Approve or Decline
  -> Approve: hold starts now and ends 4 hours later; guest notified "Viewing approved"
  -> Decline: guest notified "Viewing request declined"
After 4 hours the app shows the hold as "expired"
```

- Shown only on your own shortlet stays to guests (not to hosts, and not on partner stays, which have no local host).
- The 4 hours start when the host approves, not at the visit time the guest picked.

## Gaps found

1. **A pending request never runs out.** If the host ignores it, it stays "pending" forever. The guest gets no answer.
2. **The 4-hour hold starts at approval**, so if the guest picked a visit time tomorrow, the hold has already ended by then.
3. **Expiry is only shown on screen.** The saved status never changes to "expired", so admin counts and reports would be wrong.
4. **The guest isn't emailed** when the host approves or declines (they only get an in-app notification).
5. **A guest can send repeat requests** for the same stay while one is still open.
6. **Admins can't see viewing requests** at all.

## Proposed changes

1. A pending request expires automatically if the host hasn't replied within 4 hours, and the guest is told.
2. If the guest picked a visit time, the 4-hour hold runs from that time. Without one, it runs from approval.
3. An hourly background job marks ended holds as "expired".
4. The guest is emailed on approve and decline.
5. A guest can have only one open request per stay.
6. A new **Admin → Viewings** page lists all requests with filters (pending, approved, expired, declined).

## Technical details

- `reservations` trigger `on_reservation_status_change`: set `expires_at = greatest(now(), visit_at) + 4h` on approval; add `send_alert_email` for the guest on approve/reject.
- New cron job (hourly): pending older than 4h becomes `expired`; approved past `expires_at` becomes `expired`.
- Partial unique index on `(listing_id, guest_id)` where status in ('pending','approved').
- New `src/pages/admin/AdminReservations.tsx` + route `/admin/reservations` + nav item; admin read policy via `has_role`.
