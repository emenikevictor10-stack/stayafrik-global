# Users page: standard table + three-dot menu

## What changes
- The Users page becomes a standard table with one row per person. The columns are:
  - **Person:** photo or initial, name, and a Host or Guest tag
  - **Email:** with a tick if checked
  - **Phone / WhatsApp:** with a tick if checked
  - **Bookings:** how many
  - **Listings:** how many; shows "—" for guests
  - **Profile:** "Incomplete" when a host is missing a phone or WhatsApp number
  - **Joined:** the sign-up date
  - **Actions:** a three-dot (...) button
- The "View more" button is replaced by the three-dot menu, the same one the Listings page uses:
  - View details, which opens the person's page
  - Copy email
  - Copy user ID
- Clicking anywhere on a row also opens the person's details.
- The search box and the All / Guests / Hosts filters stay as they are.
- **Phones:** narrow screens keep each person's line compact, show only Person, Joined and the (...) button, and hide the other columns. Nothing gets squashed.
- Loading, empty and error states keep working.

## Technical details
- Only `src/pages/admin/AdminUsers.tsx` changes. It uses the existing shadcn `Table` and the `DropdownMenu` + `MoreHorizontal` pattern from `AdminListings.tsx`.
- The secondary columns are hidden below `md` with `hidden md:table-cell`.
- No changes to the data or the server.
