# Adapt StayGlobal for all screen sizes

## Problem
The app is built phone-only: every page sits in a narrow 448px column (`max-w-md`) with a fixed bottom tab bar. On tablets and desktops the content is a thin strip in the middle of a wide screen.

## Goal
One app that feels native on phone, tablet and desktop — no separate pages, same features everywhere.

## What changes

### 1. Responsive app shell (the big one)
- Rename/rework `MobileShell` into a responsive shell.
- **Phone (<768px):** unchanged — bottom tab bar, full-width content.
- **Tablet & desktop (≥768px):** replace the bottom tab bar with a left sidebar (logo, same nav items with icons + labels, notification badges kept). Content area widens: ~720px on tablet, up to ~1100px on desktop.
- Keep the existing `BottomNav` component for phones only; new `SideNav` component reuses the same tab definitions and badge logic.

### 2. Explore page
- Listing grid: 1 column on phone → 2 on tablet → 3 on desktop (currently hardcoded `grid-cols-1`).
- Search bar and filter chips stretch to the wider container.
- Map/list toggle keeps working; on desktop the map can sit beside the list (split view) if simple, otherwise full-width toggle as today.

### 3. Property detail
- Phone: current stacked layout.
- Desktop: two-column — photo gallery + details on the left, booking card (price, dates, reserve) sticky on the right.

### 4. Other client pages
- Bookings, Messages, Profile, Reservations, Payment methods: widen from `max-w-md` to a comfortable reading width (~640–720px); message threads get a two-pane layout (conversation list + open chat) on desktop, single pane with back button on phone.
- Booking flow (`BookProperty`): form centered in a card on desktop instead of edge-to-edge.

### 5. Agent & admin areas
- Agent dashboard/listings/escrow: stat cards and tables use responsive grids (2–4 columns on desktop).
- Admin console already has a sidebar layout — verify it collapses to a usable menu on phone.

### 6. Dialogs, sheets, galleries
- Modals (booking confirm, reserve, delete account, image gallery) capped at sensible widths and centered on desktop; full-screen on phone.

## Technical notes
- All via Tailwind responsive prefixes (`md:`, `lg:`) on existing components — no new pages, no routing changes.
- Breakpoints: Tailwind defaults (`md` 768px, `lg` 1024px).
- No changes to data, bookings, payments, or the RayProp integration — presentation only.
- Verify with the preview at phone, tablet and desktop sizes after each area.

## Out of scope
- No new features, no design rebranding, no native app packaging.
