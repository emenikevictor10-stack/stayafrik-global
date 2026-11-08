# Reconfirm Phase 3 (app shell and navigation)

## Result of the review
Phase 3 is almost complete. I checked it against the spec (§3 and Prompt 2) in the browser, signed out, at PC size.

**Matches the spec:**
- Phone and tablet bottom bar: Home, Explore, Trips, Saved, Account. It is 58px tall, with a ☰ menu and a 52px top bar.
- PC floating dock on the right edge, with the logo and a blue Search button. It can be dragged to the left, right or bottom edge, and remembers its place. Its menu can pin a full sidebar.
- Spec page addresses all work: /, /home, /search, /results, /explore, /stays/:id, /trips, /saved, /account.
- Signed-out guests can browse Home, Search and stays. Trips asks them to sign in.

**Three small gaps:**
1. **Dock order:** Account comes before Menu. The spec order is logo, Search, Home, Explore, Trips, Saved, Menu, Account.
2. **PC bell not tested:** since the bell change, notifications on PC live inside the dock's Menu, and that has not been tried. The spec places nothing extra in the dock, so it stays in the menu, but it must open properly.
3. **Stay page header not checked:** on phones, the new top bar may now show alongside the stay page's own back button. This was never checked with a screenshot.

Items that look like Phase 3 but belong to later phases are left alone: the Explore map (Phase 11), the stay gallery page (Phase 12), and sorting and endless scrolling on results (Phase 10).

## Steps
1. Swap Menu and Account in the dock, so Account is last.
2. Fix the bell inside the dock menu if needed: it must open, list notifications and mark them read.
3. Check the stay page on a phone screen. If two headers show, keep one with a back button.
4. Re-check at 390px and 1440px, signed in and signed out: no errors, no sideways scrolling, check:ui passes, tests pass. Then mark Phase 3 complete in the roadmap.
