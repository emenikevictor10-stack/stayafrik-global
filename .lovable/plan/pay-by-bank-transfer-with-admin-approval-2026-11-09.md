# Pay by bank transfer, with admin approval

## What the guest sees
1. At checkout, under the price, there is a choice: **Pay by card (Paystack)** or **Pay by bank transfer**.
2. If they pick bank transfer, the screen shows:
   - our account: FCMB, 4460545012, EZEKIL BASSEY
   - the exact amount, with a Copy button
   - a booking reference to put in the transfer narration
   - a 2-hour countdown
3. The guest pays from their bank app. Back on our screen, they enter the sender name and upload a receipt screenshot, then tap **I've paid**.
4. The trip shows **Payment being checked**. The guest gets a bell alert and an email when it is approved or rejected.
5. If no receipt arrives within 2 hours, the dates are released and the trip shows **Expired**.

## What admin sees
- A new **Bank transfers** page under Money, with a waiting count in the menu. It has tabs for Waiting, Approved and Rejected.
- Each row shows:
  - the guest
  - the stay and dates
  - the amount due
  - the sender name
  - when it was sent
  - a thumbnail of the receipt; click it to view full size
- **Approve** confirms the booking exactly as a card payment would. The guest and host get their emails and alerts, and the host payout is scheduled as usual.
- **Reject** needs a short reason, for example "amount doesn't match" or "no money received". The dates are released and the guest is told why.
- Every approve or reject is recorded in the booking timeline and the audit log.
- Admins can change the bank details and switch bank transfer on or off in Settings.

## Partner (RayProp) stays: important limit
RayProp only holds dates for a few minutes, much less than 2 hours. For partner stays:
- we save the booking while we wait, and RayProp is only booked after admin approves
- at approval we get a fresh price and hold from RayProp and reserve
- if the stay is gone, or the price went up, the booking moves to **Needs attention** so staff can rebook or refund by hand

Admin sees a warning on partner transfers so they approve them quickly.

## Who can approve
Admin and Finance team roles.

## Technical notes
- **Settings:** add `bank_transfer_enabled`, `bank_transfer_account` (bank, number, name) and `bank_transfer_hold_minutes` (default 120) in `app_settings` and the defaults in `src/lib/settings.ts`.
- **New table `bank_transfers`:**
  - columns: id, booking_id, guest_id, amount_kobo, reference, sender_name, receipt_path, status (awaiting_proof / submitted / approved / rejected / expired), reject_reason, decided_by, decided_at, created_at
  - grants plus RLS: guests read their own rows; staff read all
  - writes only go through database functions
- **Private storage bucket `transfer-receipts`:** guests upload into their own folder; staff read via signed links.
- **`paystack-init` gets `method: "bank_transfer"`:**
  - local stays: same price check and `held` booking with the 2-hour expiry, but no Paystack call; it returns the bank details and reference
  - partner stays: the server checks the quote, saves a `held` partner booking with the quote, guest details and markup, and creates the transfer row
  - the shared Paystack-specific checks move behind the card branch
- **Database functions:**
  - `submit_bank_transfer(_id, _sender, _receipt_path)`: guest only, own row, before expiry
  - `staff_bank_transfer_action(_id, _action, _reason)`: admin or finance, audited
  - approving a local stay calls the existing `confirm_local_payment` with the transfer reference
  - approving a partner stay calls a new `bank-transfer-approve` edge function, which re-quotes, holds and reserves through `_shared/partner-fulfil-booking.ts`, and falls back to `needs_attention`
- **Lifecycle tick:** expire unpaid transfers and cancel their holds. A `submitted` transfer keeps its hold until staff decide.
- **New screens:**
  - checkout payment choice and transfer panel in `BookProperty.tsx`
  - trip status label
  - `/admin/bank-transfers` page plus nav entry and count in `adminNav.ts` and `useAdminCounts`
  - settings fields
- **Notifications:** bell alerts and emails to the guest on submit, approve and reject; staff get a bell alert on a new submission.
- **Tests:** expiry is 120 minutes, only admin and finance can decide, rejecting needs a reason, and an approved local transfer leads to a confirmed booking.
- **Out of scope:** split payments and extras stay card-only.
