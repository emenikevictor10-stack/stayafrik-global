# Reconfirm Phases 1–3 and close the gaps

## Check result
**Phase 1 (Report a problem + Support queue) — done.** Every item in the spec is built and its tests pass. The one open item is a real end-to-end run, which needs a paid test booking (Paystack test keys).

**Phase 2 (Design system) — partly done.** The base is in place: colours, Figtree font, sizes and corners, the shared building blocks, the Light/Dark choice, the wordmark logo and the style check. Still open:
1. Coloured status labels have not all been swapped for dot-and-words statuses. About 15 pages still use the old filled labels: Trips, Stay page, booking confirmation, Reservations, Notifications, Admin Bookings, Payouts, User detail, and the host pages.
2. Not every list has a loading placeholder, an empty state with a next step, and an error state with "Try again". Most pages have the loading state; few have "Try again".
3. Section headings are not yet checked against the rule: 15px semibold, sentence case.
4. Buttons are not yet checked for the 44px minimum tap size, or the 46px height on phone.

**Phase 3 (App shell) — partly done.** The bottom bar, menu drawer, PC dock, pinned sidebar, Home, Saved, Trips and Account are working. Still open:
1. The spec's page addresses: `/home`, `/search`, `/results` and `/stays/:id`. The roadmap lists them, but only `/trips` and `/account` exist.
2. The Search buttons (Home, dock, sidebar) open Explore instead of opening the search box itself.
3. The Account page and the Stay page have no phone top bar, so the ☰ menu can't be reached from them.
4. Page titles: Trips still says "My bookings".

## Steps (one at a time, each checked in the browser)
1. **Statuses:** swap every remaining filled status label for the shared dot-and-words status, using the spec's colours: orange = needs action, red = broken, blue = done, grey = fact.
2. **List states:** add a loading placeholder, an empty state with a next step, and a "Try again" error state to every list page (guest, host and admin).
3. **Headings and tap sizes:** set section headings to 15px semibold sentence case; give buttons and icon buttons 44px tap areas (46px tall on phone).
4. **Spec addresses:** add `/home` (same as Home), `/search` (opens the search box), `/results` (Explore results with the same filters in the link) and `/stays/:id` (Stay page). The old addresses keep working.
5. **Search buttons:** Home, dock and sidebar open the search box directly: the full-screen sheet on phone, the panel on PC.
6. **Top bar everywhere:** add the phone top bar to Account and the Stay page; rename "My bookings" to "Trips".
7. **Style check:** extend the check so it also flags filled status labels and old-style headings; run it, plus the existing tests.
8. **Verify:** take screenshots at 360px, 768px and 1280px for Home, Results, Stay, Trips, Saved, Account and the admin lists. Check a forced error shows "Try again", and empty lists show their next step.

## Technical notes
- Statuses use `Tag` from `src/ui/kit.tsx`. A `toneFor(status)` map in `src/lib/status-tone.ts` gets a small test.
- List states use `ListSkeleton`, `EmptyState` and `ErrorState` from the kit. Each list page tracks a load error and re-runs its fetch on "Try again".
- `/search` mounts Explore with the search box open, using a URL flag. `/results` reuses the Explore page; `/stays/:id` reuses PropertyDetail. All internal links move to the new addresses, and old ones still work.
- `check:ui` gains rules for status-badge class combinations.
