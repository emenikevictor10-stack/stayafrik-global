# Phase 20 (Insights): recheck and close-out

## Where it stands
Admin → Insights is marked done, but it only covers part of the specification. Today it has:
- 7, 30 and 90 day tabs, each compared with the period before.
- Totals for each period.
- A funnel with four steps: started, paid, didn't finish paying, cancelled.
- One daily chart of bookings and payments, which can switch to a table.
- A one-line split between our own stays and partner stays.

## Not built yet
1. **More period tabs:** This month, This year and a custom date range, all in Lagos time.
2. **Headline chart:** four switchable measures (booking value, money received, bookings confirmed, nights sold). Each shows its total and the change from before, drawn as a line with the earlier period in grey and a hover tooltip.
3. **Full funnel:** started, dates held, reserved, paid, confirmed, each with its share of "started".
4. **Earnings card:** exact Stay earnings (service fee, partner markup, extras), shown as a split bar with refunds paid.
5. **How guests pay:** card versus bank transfer, plus the average payment.
6. **Six tiles with change from before:** average nightly rate, average booking, average stay, days booked ahead, cancelled share (with a small trend line) and repeat guests.
7. **Three bar charts:** length of stay, check-in day (busiest day highlighted) and how far ahead guests book.
8. **Next 30 days:** stays in house each night, arrivals, value already booked and the busiest night.
9. **Top areas and top stays:** ranked bars by value, bookings and nights, with links to each stay. Plus a split between partner and own stays for value and earnings.
10. **Sign-ups:** new sign-ups by day and a small Guests card.
11. **Every chart:** a hover tooltip and a Table button.
12. **Accuracy:** Insights totals should match the Bookings and Payments lists for the same period. This is the PRD's launch check.

## Steps
1. Extend the database insights report so it returns everything above in one call. A booking counts as sold on the day it was confirmed.
2. Rebuild the Insights page in the PRD layout, with plain SVG charts in the brand chart colours.
3. Add tests for the period dates (month, year, custom, Lagos time) and the change-from-before maths.
4. Check in the browser with temporary test bookings: switching the headline tab redraws the chart, each table matches its chart, and the totals match the Bookings and Payments lists. Then remove the test data.
5. Mark Phase 20 done in the roadmap.

## Technical details
- `admin_insights(_from, _to)` grows into a single jsonb with `headline`, `funnel`, `earnings`, `pay_mix`, `tiles`, `stay_length`, `checkin_dow`, `lead_time`, `next30`, `top_areas`, `top_stays`, `by_source`, `signups` and `guests`.
- "Started" comes from all bookings created. Held, reserved and paid come from `booking_events`, and confirmed from `confirmed_at`.
- Earnings use `fee_kobo + markup_kobo` plus paid `addon_orders`. Refunds come from `refunds`.
- Pay mix uses `bank_transfers` approved against card references.
- Pure period helpers go in `src/lib/insights.ts` (tested). The charts are small shared SVG pieces with a tooltip and a table toggle. `AdminInsights` moves out of `AdminOps.tsx` into its own file.
