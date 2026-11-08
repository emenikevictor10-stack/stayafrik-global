# Phase 3 — App shell and navigation (PRD §9, prompt 2)

## What you will see
**Phone and tablet (under 1280px wide)**
- Slim 52px top bar: Stay logo, page title, bell.
- 58px bottom bar for guests: **Home, Explore, Trips, Saved, Account**.
- A "Menu" drawer (from the top bar) holding Inbox (with unread count), Your problems, Reservations, Become a host / Switch to guest, Help, Privacy, Terms, Log out.
- Hosts keep their own bar: Dashboard, Listings, Escrow, Inbox, Account (full host portal comes in Phase 8).

**PC (1280px and wider)**
- No top menu row. A floating dock on the right edge: logo, blue "Search" button, Home, Explore, Trips, Saved, Menu, Account, with unread dots.
- Drag the dock to the left, right or bottom edge; it remembers where you put it.
- The Menu can "Pin sidebar" to swap the dock for a full sidebar (also remembered), and unpin back.
- Page content sits in a fitted 1360px-wide column, not stretched.

**New pages**
- **Home** (`/`): search bar (opens the existing search), popular places, recently viewed stays, your next trip card (if any), and a few approved stays. Signed-out visitors can see it.
- **Explore** (`/explore`): the current full results grid, unchanged.
- **Trips** (`/trips`): the current Bookings page under the spec's name; `/bookings` keeps working and forwards there.
- **Saved** (`/saved`): grid of stays you hearted (from the existing heart button), with an empty state pointing to Explore.
- **Account** (`/account`): the current Profile page; `/profile/...` links keep working.

## Steps (one at a time, each checked in the browser)
1. Navigation config: new guest tab list + menu items; rename labels (Bookings → Trips, Profile → Account).
2. Routes: add `/trips`, `/saved`, `/account`, new Home at `/`, Explore at `/explore`; forward old links.
3. Phone/tablet: rebuild top bar (52px) and bottom bar (58px, 5 tabs, 44px+ tap areas), menu drawer with Inbox count.
4. PC dock: floating, draggable to left/right/bottom with snap, remembered; Search button opens the search sheet.
5. Pinnable sidebar option from the dock Menu, remembered.
6. Saved page and recently-viewed tracking (saved on this device, like hearts today).
7. Home page sections with loading/empty states.
8. Verify at 360px, 768px, 1280px: every tab reachable, dock drag + reload keeps position, pin/unpin, no sideways scroll, hosts still see host tabs, admin unaffected.

## Not in this phase
- Admin shell (Phase 4), host portal redesign (Phase 8), search/results redesign (Phase 10), shared wishlists (Phase 13).

## Technical notes
- `navTabs.ts` gains `guestTabs`, `guestMenu`, `hostTabs`; `MobileShell` picks bottom bar (<1280) vs `Dock`/`PinnedSidebar` (>=1280); old `SideNav` removed, `TopBar` desktop row removed.
- Dock position and pin state in localStorage (`sg-dock-edge`, `sg-nav-pinned`); drag uses pointer events, snaps to the nearest edge.
- Recently viewed: small `useRecentlyViewed` hook (localStorage), written by PropertyDetail.
- `<Navigate>` redirects for `/bookings` → `/trips` and `/profile` → `/account` (sub-pages under `/profile/*` stay as-is).
- Run `check:ui` and existing tests after.
