# Phase 15 (Invoices) — close-out

## Already there
- Guests can open an invoice from a trip. Before payment it's a proforma; after payment it's a paid invoice.
- Each invoice gets a number like SG-INV-2026-000001. The number stays the same if the guest updates their company name or tax ID.
- The guest can add an optional company name and tax ID, then save the invoice as a PDF from the print window.
- Only the guest and staff can open an invoice. No real invoice has been made yet (0 in the database).

## Still missing (to fix)
1. **Company details from Settings aren't used.** The invoice always prints "StayGlobal / support@stayglobal.app". It should show the company details admins enter in Settings, plus the support email setting.
2. **No "Issue invoice" for staff.** The PRD puts this in the admin booking More menu. Add it there: it opens the same invoice, with company name and tax ID fields, ready to print.
3. **"Billed to" says "Guest".** It should show the guest's name and email, with the company underneath when there is one.
4. **Extras aren't on the invoice.** Paid extras such as airport pickup should be added as their own lines and included in the total.
5. **The PDF isn't clean.** Printing includes the app's menus and bars. Print only the invoice.
6. **Invoices can't be switched off.** Add an "Invoices" switch to Settings (on by default). When it's off, hide the Invoice button and the staff action.
7. **Company details can't be removed.** Once added, a company name or tax ID can't be cleared. Allow clearing them.

## Checks
- Small tests: proforma vs paid by booking status, total including paid extras, switch hides the button.
- Make one temporary booking, then open the invoice as the guest and as staff, before and after payment. Print-preview it on a phone and a computer, then delete the test data.

## Technical details
- `issue_invoice`: build "Billed to" from the guest's profile; add `addon_orders` lines where status is paid or arranged, and add them to `amount`; only change company/tax when a value is actually sent (empty text clears it); use the next number only for new rows.
- Read `company` and `support_email` through `useSettings`; add an `invoices_enabled` setting with a default in `src/lib/settings.ts`.
- Admin booking detail: More → Issue invoice links to `/trips/:id/invoice?staff=1` (the database function already allows staff).
- Print: `print:hidden` on TopBar/BottomNav/Dock and the assistant button; `@page` margins in `index.css`.
- Update roadmap P15.
