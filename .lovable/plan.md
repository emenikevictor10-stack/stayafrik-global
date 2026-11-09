# Phase 21 (Emails + scheduled jobs): close-out, plus the remaining-phases check

## Short answer
Phase 21 is **not** finished. Phase 23 is also still open. Phases 1–20 and 22 are closed. Separately, launch Phase 0 (a real paid test booking) is still waiting on Paystack test keys.

## What's working today
- A job runs every 5 minutes. It releases expired holds, sends check-in reminders and thank-yous, nudges hosts about their 4-hour deadline, and checks for overdue support replies.
- Other scheduled jobs handle declined or late booking requests (with refunds), import host calendars (hourly), queue review requests, expire viewings, and clear old job history every night.
- About 30 alert messages exist: booking confirmed, payment received, bank transfer accepted or rejected, split-share reminders, viewings, payout on hold, hosting paused, problem replies, and "Is it fixed?".

## What's still missing
1. **No email has ever been delivered.** The email log shows 0 sent, 84 failed for good, and 42 waiting. The sending domain still isn't verified. Nothing else in this phase can be proven until that's fixed.
2. **Branded layout:** every alert uses one plain layout. The brief asks for the StayGlobal wordmark at the top, plain copy and one button.
3. **Emails from the brief that don't exist yet:**
   - booking held
   - bank details for transfer
   - host request sent
   - host declined
   - hold expired
   - cancelled with refund
   - refund paid
   - host reminder about tomorrow's arrivals
   - email alerts to staff (staff currently get in-app alerts only)
4. **RayProp payment check:** no job checks RayProp booking status to catch a webhook we missed.
5. **Host calendar import** runs every hour; the brief says every 30 minutes.
6. **Job run history:** there's no record of each scheduler run, with its result, on the Health page.
7. **RayProp wallet alert:** this stays blocked because RayProp offers no way to read the wallet balance.

## Phase 23 (Hardening) still open
- Limits on how often actions can be repeated: on payment start, sign-in PIN, problem reports, bank-transfer submissions and viewing requests.
- Speed and quality check of the main pages, with fixes for the worst issues.
- Full test-mode payment journeys. These are blocked until Paystack test keys are added.

## What I'll build
- **Step 1, email delivery:** check the sending domain's status and fix the setup, then retry the 42 waiting emails. If the domain's DNS still needs you, I'll stop and show you exactly what to add.
- **Step 2:** one branded email layout (wordmark, heading, text, one button, footer with support@stayglobal.app). Every alert, old and new, uses it.
- **Step 3:** the missing emails from list item 3, each sent at the moment it happens. Every booking email includes the listing ID.
- **Step 4:** a job every 15 minutes that checks the status of partner bookings in `processing` or `needs_attention` with RayProp. It finishes or flags them using the existing fulfilment steps, which already handle pauses.
- **Step 5:** host calendar import every 30 minutes.
- **Step 6:** a log of each scheduler run, shown on the Health page.
- **Step 7:** Phase 23 limits and the page speed check.
- **Step 8:** the roadmap marks Phase 21 and Phase 23 closed, except the items blocked by Paystack test keys and the RayProp balance lookup.

## Technical details
- Email: check with `email_domain--check_email_domain_status`, then retry DLQ and pending items through `process-email-queue`. The branded layout becomes one shared HTML builder used by `send_email_to` / `send_alert_email` (SQL) and the edge-function senders.
- New emails hook into existing paths: `paystack-init` (held, bank details), `host_booking_action` / `booking-requests` (request sent, declined, expired), `cancel-booking` and `staff_booking_action` refund (cancelled with refund, refund paid), and `booking_reminders_tick` (host arrivals). `notify_admins` also sends email to admin-role users, using a settings switch.
- Partner check: new edge function `rayprop-reconcile` called by cron. It reuses `_shared/partner-fulfil-booking.ts` and the `partner_sync_state` pause.
- New table `cron_runs` (job, started_at, ok, summary), service-role write and staff read via `private.is_staff`; ticks insert a row.
- Rate limits: a `rate_limit_hit(key, max, window)` function with a small table, called from the RPCs and edge functions above.
- Tests cover the email layout builder (button and listing ID present), the rate-limit helper, and the reconcile decision helper.
