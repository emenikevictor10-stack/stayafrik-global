# Phase 8 recheck, then Phase 9: Admin Hosts + Payouts

## Part A: Reconfirm Phase 8 (host portal)
Confirmed so far: all host pages are wired (/host, listings, calendar, requests, bookings, payouts, /list-your-place) and old links redirect. Before moving on I will:
- Open each host page signed in, on phone and PC, and confirm no errors.
- Check guest privacy: first name only before confirm, full name after (via `host_booking_guests`).
- Check payout totals on host pages match saved host share per booking.
- Run all tests. Fix any gap found, then mark Phase 8 confirmed.

## Part B: Phase 9 (PRD §5)

**1. Admin Hosts page (new, under People)**
- One row per host: name, ID status, payout account (bank, masked number, verified or not), live listings, bookings, money held/due/paid, status (active / suspended), joined date.
- Search and tabs: All, Needs bank check, Suspended.
- Three-dot menu: view details, approve host, suspend (reason required), lift suspension.
- Suspended hosts: listings hidden from search, no new bookings; existing bookings continue.

**2. Bank account check**
- Admin can mark a payout account verified (optionally using Paystack account name lookup to show the matched name).
- Every check, suspend and approve is written to the audit log with who and why.

**3. Payouts rebuilt**
- Payout becomes due the day after check-in (payout delay from Settings), amount = saved host share.
- Tabs: Due, On hold, Paid, Failed.
- Hold with reason (required) and release hold.
- Mark paid with transfer reference (required) and date; or send via Paystack transfer as today.
- Blocked from paying when bank not verified, host suspended, or (if Settings ID gate on) ID not approved; the reason shows on the row.
- Download CSV of the current filtered list.
- All actions go through one server function so they are audited and status moves are checked; admins no longer edit payout rows directly.

**4. Host side**
- Host Payouts shows "On hold" with the reason, and the paid reference.
- Suspended host sees a clear banner on Hosting home.

## Technical details
- Migration: `host_status` table (host_id, status, reason, by, at) or columns on profiles-adjacent table (not roles); `payment_methods.verified_at/verified_by/account_name`; `payouts` add `due_at, hold_reason, held_at, paid_reference, paid_at`, status check (pending, due, on_hold, paid, failed).
- RPCs: `staff_host_action(host_id, action, reason)`, `staff_payout_action(payout_id, action, reason, reference)`, admin-checked with `private.has_role`, writing to audit log; remove admin direct UPDATE on payouts.
- `queue_payout_on_release` sets `due_at`; search functions exclude suspended hosts' listings; `paystack-init` refuses suspended hosts.
- Pure helper `src/lib/payout-rules.ts` (can pay? reason; CSV rows) with vitest tests.
- Admin nav gets Hosts entry and "payouts due" count.

## Not in this phase
Automatic bulk transfers, host tax documents, team/moderator roles (Phase 19). Real paid flow still waits on Paystack test keys.
