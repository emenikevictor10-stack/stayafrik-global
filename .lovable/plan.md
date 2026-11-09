# Phase 12 (Stay page) close-out

Phase 12 is marked done, and most of it is built: the plain title with the host's own title under it, Listing ID with copy, live price for the chosen dates (nightly, discount, cleaning, fee, total), power/water/security, house rules, cancellation policy, and the full photo page.

Five things are still open. Two of them affect location privacy.

## Still open

1. **The area map shows the exact spot (privacy).** The stay page map centres its circle on the real address, so the stay sits right in the middle. If the map fails to load, the backup map opens at the exact point. Fix: use the same "approximate point + 800 m circle" rule as Explore for both maps, so the real address is somewhere inside the circle but not at its centre.
2. **The stay page uses a different map.** The stay page uses Google Maps, but Explore uses the free map. Fix: switch the stay page to the same free map so it looks the same, costs nothing and follows one privacy rule.
3. **No date price for partner stays.** When dates are chosen, the price breakdown only shows for our own stays. Fix: for partner stays, show the partner's quote for those dates (nightly, fees, total). If the partner can't give a quote, show "Price confirmed at checkout".
4. **Old wording.** The page still says "PropertyEscrow™", and it mentions "title documents" from the old property-sale version of the app. Fix: say "Secure Escrow" and use one line about stays: "payment held safely until 24h after check-in".
5. **Phone bar offset.** The sticky Book bar is still pushed over for a side menu that no longer exists, so on tablets it's off-centre. Fix: remove that offset.

## Checks
- New tests: the stay page map point is never the exact spot, and the circle always contains the real spot.
- Browser check on phone and computer: one of our own stays and one partner stay, with and without dates, signed out and after payment (the exact pin only appears once payment is confirmed).
- Then update the Phase 12 note in the roadmap.

## Technical details
- `SinglePropertyMap` in `src/components/map/PropertyMap.tsx`: rebuild it on Leaflet/OSM using `approxPoint` + `AREA_CIRCLE_M` from `src/lib/map-pins.ts`. Draw the exact marker only when `approximate=false`. The fallback must also use the approximate point.
- `DatePrice` in `PropertyDetail.tsx`: for `source === "rayprop"`, call `rayprop-api` quote and show the result with `koboToNaira`. If the call fails or is paused, the page keeps working.
- Remove `md:left-60` from the sticky CTA. Fix the escrow copy at about lines 386 and 429.
