# Phase 15 (invoices) — final confirmation

The last pass fixed all seven gaps in invoices, and the server-side checks passed. Three things were never checked on screen, so I can't call Phase 15 fully done until they are.

## What's left to check
1. **Guest invoice page:** open a trip's invoice on a phone and on a computer. It should show the company details from Settings, who it's billed to (name, email, plus company and tax ID if added), any paid extras listed separately, and the right total.
2. **Staff "Issue invoice" button:** on Admin → Bookings, the button should open the same invoice, ready to print.
3. **Print view:** the print preview should show only the invoice, with no menus, bottom tabs or assistant button.
4. **On/off switch:** turn "Invoices" off in Settings and check that the Invoice button disappears for guests and staff. Then turn it back on.

## How
- Make a temporary confirmed booking that includes one paid extra, with a company name and tax ID added.
- Go through steps 1–4 in the browser on a phone-size and a computer-size screen, and take screenshots.
- Fix anything that doesn't look right, then run the invoice tests again.
- Delete the temporary booking, extra and invoice afterwards.

## Result
Once this passes, I'll confirm Phase 15 is done and list anything still waiting on something outside the app, such as email sending, which needs the email domain verified first.
