# Cancellation: current state and plan to finish it

## Where it stands today

| Who cancels | Own stays | RayProp stays |
|---|---|---|
| Guest | Works. Trip page shows exact refund first (100% at 48h+, 50% under 48h, none after check-in), then refunds via Paystack. | Partly. Cancels with RayProp and marks the booking cancelled, but the guest gets no refund from us and no refund amount is shown or saved. |
| Admin | Partly. Only a browser pop-up asking for an amount on Bookings; no proper confirmation window, no policy preview, no reason. | Missing. Partner bookings page has no cancel button (only retry/refund for unconfirmed ones). |
| RayProp | n/a | Partly. Their "cancelled" message updates our booking status, but the guest is not refunded and staff aren't alerted. |
| Host | Not available (hosts can only decline requests). | n/a |

Also: there are two different guest cancel screens (Trips list pop-up and the trip cancel page) with slightly different wording.

## Plan

1. **One cancel window for guests** — use the trip cancel page everywhere (Trips list button opens it). For RayProp stays, show the refund RayProp returns before confirming, then save and show the amount.
2. **Guest RayProp refunds** — after RayProp confirms the cancel, refund the guest what RayProp refunds (plus our markup/fee per the same policy) through Paystack, or mark it for a manual refund if paid by bank transfer. Log it in the booking timeline.
3. **Admin cancel window** — replace the pop-up with a proper window on Bookings and Partner bookings: policy refund pre-filled, editable amount, required reason, "type CANCEL" confirm. RayProp bookings are also cancelled with RayProp.
4. **RayProp-initiated cancels** — when RayProp cancels, refund the guest in full, notify guest, alert admins, log the event.
5. **Host cancel (optional)** — host can cancel a confirmed booking with a reason; guest always gets 100% back and admins are alerted.
6. **Checks** — tests for refund amounts per case; run one bank-transfer cancel per path end-to-end.

## Technical notes
- Extend `cancel-booking` to handle `source = rayprop` (call `raypropCancel` server-side, admin allowed via `has_role`), keep refund math in `_shared/cancellation-core.ts`.
- `rayprop-webhook`: on mapped `cancelled`, trigger refund + `notify_admins` + `booking_events`.
- Card refunds still can't be tried without Paystack test keys.
