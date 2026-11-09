# Phase 16 (split payments): close-out

## Result of the check
Phase 16 is **not fully done**. The basics work: you can split a local stay between 2–6 people at checkout, each person gets a pay link (`/pay/share/...`), the booking confirms once everyone has paid, and paid shares are refunded if time runs out. When compared with the product brief, these parts are missing:

1. **Custom amounts.** The brief says the organiser sets each person's share. Today the cost can only be split equally.
2. **Who each person is.** The brief asks for each co-traveller's name, phone and email. Today the rows only say "Person 2", "Person 3" and so on.
3. **Bank transfer for a share.** The brief says each person can pay by card or transfer. Today shares can only be paid by card, and split is hidden when the organiser picks bank transfer.
4. **Reminders.** The brief's 5-minute scheduler should remind people who haven't paid yet. No reminder is sent today.
5. **Changing a person.** The organiser can't remove someone or resend or replace an unpaid link.
6. **Staff view.** Admin → Bookings doesn't show the shares (who has paid, how much, which links are still open).
7. **Mixed-up limit.** The checkout offers up to 6 people, but the server check allows 8. They should both allow 6.
8. **Never paid through for real.** Card payments need Paystack test keys. Bank-transfer shares can be tested from start to finish once item 3 is done.

Partner (RayProp) stays stay excluded on purpose (local stays only), as agreed before.

## What I'll build
- **Checkout "Split the cost":** pick 2–6 people, then either "Split equally" or "Set amounts". With set amounts, the total must match exactly before Pay unlocks. Each person can have an optional name, phone and email.
- **Organiser's trip page:** each person shows their name, amount and paid status, with Copy/Share link, Resend reminder and Remove/replace for unpaid people. Removed people's links stop working. Their amount moves to the organiser, who is asked to cover it.
- **Pay-your-share page:** offers Card or Bank transfer. Bank transfer uses the existing transfer page (account details, countdown, receipt). When staff approve it on the Bank transfers page, that share is marked paid.
- **Reminders:** the 5-minute scheduler reminds unpaid people by email (when an address was given) and the organiser in the app, at most every 12 hours and once more 2 hours before time runs out.
- **Admin → Bookings:** a "Split payment" box listing each share with its status, amount, payment method and refund status.
- **Tests:** custom amounts must add up to the total, the limit is 2–6 people, a removed share can't be paid, and the reminder timing is correct.
- **End-to-end check:** in the browser, two people each pay their share by bank transfer, staff approve both, and the booking confirms. The test data is then deleted.

## Technical details
- Add `name`, `phone`, `email`, `removed_at`, `last_reminded_at` and `pay_method` to `payment_shares`, in an additive migration that keeps the existing RLS.
- `paystack-init` mode `split` accepts optional `shares: [{amount_kobo,name,phone,email}]`. It is checked server-side by a new pure `validateCustomShares` in `_shared/booking-core.ts` (sum = total, each ≥ ₦1,000, 2–6). `splitShares` changes to a 2–6 limit.
- Shares paid by bank transfer: `bank_transfers.meta.share_id`. `staff_bank_transfer_action` approve then calls `record_share_payment`, which keeps a single confirm path through `confirm_local_payment`.
- New RPCs `split_share_action(share_id, 'remove'|'remind')`, limited to the organiser and only for unpaid shares. `get_payment_share` returns nothing for removed shares.
- Reminder sweep added to `booking-requests` (already on the scheduler), using the existing email queue.
- Update the `AGENTS.md` split-payments rule and mark P16 in `roadmap.md`.
