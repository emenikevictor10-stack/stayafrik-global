# Phase 17 (Extras / add-ons) — close-out

Phase 17 is not fully done. The basics work: three starter extras, guests buy them on the trip page by card, and staff mark them "arranged". No extra has ever been ordered, and card payment is untested without Paystack test keys. Compared with the PRD, these gaps remain:

## Gaps to close
1. **Catalogue items:** the PRD lists airport pickup, mid-stay clean, stocked fridge and late check-out. We have airport pickup, grocery stock-up and extra cleaning. Rename these to match the PRD and add late check-out. All prices are placeholders, so please send the real ones.
2. **City per extra:** the PRD lets an extra be offered only in some cities, such as airport pickup in Lagos only. Add an optional city and show guests only the extras for their stay's city.
3. **Order stages:** the PRD stages are awaiting payment, paid, confirmed, done, cancelled and refunded. Today we only have paid and arranged. Staff will get "Confirm" and then "Mark done".
4. **Guest cancel:** guests can cancel an extra before it is confirmed. A paid extra gets a refund: by card through Paystack, or marked for staff to send back by hand if paid by transfer.
5. **Cancelling the booking:** extras are refunded with the stay. At the moment, cancelling a stay leaves its paid extras untouched.
6. **Pay by bank transfer:** extras can be paid by bank transfer, approved on the Bank transfers page like stays.
7. **Admin catalogue editing:** staff can edit the name and description, not just the price and the on/off switch, and set the city.
8. **Admin booking detail:** show the booking's extras and their stages.
9. **Insights:** StayGlobal earnings include extras income, as the PRD asks.
10. **Before check-in only:** keep the rule that extras can only be bought for confirmed or awaiting-host trips before check-in. It also needs a server-side check, not just a hidden button.

## Checks
- Tests for the order stages, refund amounts and city filtering.
- With a test booking: order an extra by bank transfer, approve it, confirm it, mark it done, then cancel a second extra and see it marked for refund. Delete the test data afterwards.
- Look at the trip page and Admin → Add-ons on a phone and a computer.

## Technical details
- Migration: add `addons.city_id` (nullable, locations) and widen the `addon_orders.status` stages. Old `arranged` rows become `confirmed` (there are none today). Extend `staff_addon_action` with confirm, done, cancel and refund. Add a guest RPC `guest_addon_cancel`.
- `paystack-init` mode `addon`: add server checks for booking status and dates, plus city match. Method `bank_transfer` stores `meta.addon_order_id`, and approval calls `confirm_addon_payment`.
- `cancel-booking`: refund paid add-on orders through Paystack, or as a manual refund for transfers.
- `admin_insights`: add the sum of extras income.
- The pure helper `src/lib/addons.ts` handles stage moves and refund amounts, with tests.
