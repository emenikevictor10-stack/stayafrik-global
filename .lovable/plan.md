# Home page review — simple improvements

Reviewed on phone (390px), tablet (820px) and desktop (1440px).

## What looks off

1. **Logo shows twice on tablet/desktop** — once in the sidebar, again next to "Explore" in the top bar.
2. **Sidebar feels empty** — four links at the top, then a tall blank column. No account or role info, nothing at the bottom.
3. **Sidebar too wide on tablet** — at 820px it takes 240px, so filter chips get cut off ("Never da…").
4. **Broken chip icons** — "All", "Budget friendly", "Never dark", "Luxury" show empty boxes instead of icons on all screens.
5. **Loading spinner sits off-centre** on tablet/desktop (pushed left instead of centred in the page).
6. **Desktop content stretches edge to edge** — search bar is extremely wide on big screens.

## Suggested fixes

1. Hide the top-bar logo when the sidebar is visible; keep just the page title.
2. Sidebar polish: add a slim divider under the logo, move the role switch (Client/Agent) and the profile avatar + name to the bottom of the sidebar, and remove the "CLIENT" pill from the top bar on desktop.
3. Tablet: use a narrow icon-only sidebar (about 72px, labels on hover) from tablet up to small laptops; full sidebar with labels only on large screens.
4. Replace the emoji chip icons with the same line icons used elsewhere so they render everywhere.
5. Centre the loading spinner and empty states within the content area.
6. Cap content width on large screens (about 1280px, centred) so the search bar and cards don't stretch.

## Technical notes
- SideNav.tsx: `md:w-[72px] lg:w-60`, labels `hidden lg:inline`, bottom section with avatar + role toggle via `mt-auto`.
- MobileShell/TopBar: hide logo and role pill at `md:`; matching left padding `md:pl-[72px] lg:pl-60`.
- Explore.tsx: SMART_FILTERS icons to lucide components; loader wrapper `w-full flex justify-center`; content `max-w-7xl mx-auto`.
