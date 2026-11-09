# Phase 10 — Search & results (PRD §3)

Goal: `/results` becomes a proper results page — sort, a filters sheet, 12 stays at a time loading as you scroll, PRD stay cards, and helpful suggestions when nothing matches. Explore map stays as it is (Phase 11).

## What guests will see
1. **Sort** (top of results): Recommended, Price low to high, Price high to low, Rating, Newest. Saved in the link.
2. **Filters sheet** (bottom sheet on phone, dialog on PC), with a count badge on the Filters button:
   - Price per night (min–max)
   - Bedrooms (Any, 1, 2, 3, 4+)
   - Property type (Apartment, House, Studio, Duplex…, from what stays actually have)
   - Power: 24h, Generator, Inverter, Solar
   - Water (running water / borehole)
   - Verified stays only
   - Rating 4+
   - "Clear all" and "Show N stays"
   All saved in the link, so sharing or going back keeps them. The old quick chips (budget, top rated, family) become shortcuts into these same filters.
3. **12 at a time**: next 12 load automatically when the last row is ~400px away, plus a "More stays" button as a fallback. Skeleton cards while loading.
4. **Stay cards (PRD spec)**: photo 204px tall on PC with swipe/arrows for more photos on phone, heart to save, add-to-compare, price per night on top, then "area · N bed · ★ rating". No long title. 4 per row on PC, 1 per row on phone, page max width 1360px.
5. **No results**: friendly empty state with (a) nearby areas in the same city/state that have stays, tap to search there, (b) "Try other dates" with the nearest dates that have availability when dates were chosen, (c) Clear filters.
6. Results header: "Stays in Lekki" (no count, per earlier decision).

## Not in this phase
- Map/price pins and hover highlight (Phase 11), stay page rebuild (Phase 12), compare page and shared wishlists (Phase 13 — the compare button stores picks on the device until then).

## Checks
- Unit tests for the sort order, each filter rule (power/water/verified/rating 4+/price/bedrooms/type) and paging.
- Browser at 390px and 1440px: sort, filters, scroll-loading, card, empty state, URL survives reload; signed out and signed in; `check:ui` passes; no console errors. Partner stays included in a Lekki search.

## Technical notes
- New pure helpers `src/lib/results.ts`: `applyFilters`, `sortStays`, `parseResultsParams`/`toResultsParams`, `powerTags`/`hasWater` (match amenities + RayProp facts via `rayprop-map`), `paginate`. Tested in vitest.
- `Explore.tsx` split: `ResultsToolbar` (sort + Filters button), `FiltersSheet` (uses kit `Sheet`), `ResultsGrid` with IntersectionObserver (rootMargin 400px) + "More stays" button; existing date/guest/place filtering kept.
- `PropertyCard` reworked to the PRD `StayCard` in `src/ui/kit.tsx` (used by Home/Saved too); lazy WebP images; compare picks in localStorage (`useCompare`, max 4).
- Partner availability check runs per visible page of 12 (not the whole list) to save RayProp calls; `rayprop-api` paging unchanged.
- No-results suggestions: sibling places from `locations` (same parent, listing_count > 0) and nearest open dates from `listing_booked_ranges` for the matching stays (local) — partner date suggestions skipped to avoid extra calls.
- Mark P10 done in `roadmap.md`; add an `AGENTS.md` rule for results helpers.
