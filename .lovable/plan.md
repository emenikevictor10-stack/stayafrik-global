# Home page review — simple improvements

Reviewed on phone (390px), tablet (820px) and desktop (1440px).

## What looks off

1. **Logo shows twice on tablet/desktop**: once in the sidebar and again next to "Explore".
2. **Sidebar feels empty**: four links, then a tall blank column. With only 4 links it isn't needed.
3. **Sidebar eats space on tablet**: filter chips get cut off ("Never da…").
4. **Broken chip icons**: "All", "Budget friendly", "Never dark" and "Luxury" show empty boxes.
5. **Loading spinner sits off-centre** on tablet/desktop.
6. **Desktop content stretches edge to edge**: the search bar is very wide.

## Suggested fixes

1. **Remove the sidebar completely.**
   - **Computer:** one slim top bar with the Stay logo on the left, then Explore · Bookings · Inbox · Profile links, then the notifications bell and avatar on the right.
   - **Tablet and phone:** the top bar shows the logo, bell and a hamburger button (three lines). Tapping it slides open a menu with the 4 links, Client/Agent switch, and Log out.
   - Recommendation: keep the bottom tab bar on phones as well. It's quicker to reach with a thumb, and booking apps like Airbnb use it. If you'd rather use the hamburger only, we'll drop the bottom bar.
2. Show the logo only once (in the top bar).
3. Replace the broken chip icons with the same line icons used elsewhere.
4. Centre the loading spinner and empty states.
5. Limit page width on big screens (about 1280px, centred) so the search bar and cards don't stretch too far.

## Technical notes
- Delete SideNav usage and the `md:pl-60` offset in MobileShell. New `TopNav` holds desktop links at `lg:` and a hamburger at `<lg` that opens a shadcn `Sheet` with the navTabs, role toggle and log out.
- The BottomNav stays at `<md` (or is removed if the user chooses hamburger only).
- Explore.tsx: change SMART_FILTERS icons to lucide components, use a `w-full flex justify-center` loader, and wrap content in `max-w-7xl mx-auto`.
