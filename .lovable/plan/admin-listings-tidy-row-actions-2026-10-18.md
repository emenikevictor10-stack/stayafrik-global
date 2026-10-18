# Admin Listings: tidy row actions

## What changes
**Approved tab rows**
- Take the red "Revoke" button off every row. Revoking is a rare, risky action, so it shouldn't be a bright button repeated on every line.
- Swap the ">" arrow for a "⋯" (three-dot) menu button. It opens:
  - View details (opens the row, same as tapping it)
  - Open listing page (opens in a new tab)
  - Copy listing ID
  - Revoke approval (red, at the bottom; still asks you to confirm and lets you give a reason)
- Add a **Status** column showing a green "Live" label, so the list makes sense without the button.

**Pending tab rows**
- Approve and Reject stay as buttons, because reviewing is the main job on that tab.
- The ">" arrow becomes the same "⋯" menu (View details, Open listing page, Copy listing ID).

**Opening a row**
- Tapping a row still opens its full details underneath. A small arrow next to the title shows whether a row is open or closed.

## What each listing row shows
Photo · Title (listing ID, type, photo count) · Place · Beds/baths · Price per night · Host · Status (Approved tab) or Submitted date (Pending tab) · Actions.
On the Approved tab, "Approved on" replaces "Submitted", since that date matters more there.

## Technical
- `src/pages/admin/AdminListings.tsx`: use the shadcn `DropdownMenu` with the `MoreHorizontal` icon and stop click events from opening the row; keep the existing `confirmAction` revoke flow; change the column template for each tab. Use `approved_at`/`updated_at` if the field exists, otherwise `created_at`.
