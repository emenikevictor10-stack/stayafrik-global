Move the Filters button next to the Map button on the search page.

- Search bar stays centred.
- Right side shows Filters then Map, side by side; left side becomes an empty spacer so centring holds.
- Same on phone and computer; check both after.

Technical: in `src/pages/client/Explore.tsx` (~line 220–240), move the Filters button into the right grid cell with the Map toggle (flex gap-2, justify-end); leave left cell empty.
