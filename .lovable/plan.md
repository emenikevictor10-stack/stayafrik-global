# Phase 11 (Map & Explore) — recheck result and close-out

## Recheck result
Phase 11 is marked done, and most of it works. Rechecking it against what we agreed turned up five things still open:

| What we agreed | Where it stands |
|---|---|
| Every stay shown as a price pin | Done, but stays with no saved map location are silently left off the map |
| List beside the map on PC, under it on phone | Done |
| Hovering a card highlights its pin | Built in, but not yet tested in the browser |
| Nearby pins merge into an "N stays" bubble that zooms in when tapped | Built in, but tapping it was never tested |
| Approximate **circles** only, never the exact building | Partly done: pins are moved a little (300–700m) from the real spot, but there's no area circle when you pick a pin |
| Free map with MapLibre (the PRD) | We used a different free map tool (Leaflet with OpenStreetMap). It works, but it isn't what the PRD names |
| Data quality | Many of our own stays share almost the same location around Yaba, so the map bunches them into one spot |

## Plan to close it
1. **Area circle:** when you tap a pin or a card, show a soft circle about 500m wide around the shifted point instead of an exact spot. Keep showing the price label.
2. **Stays with no location:** add a line under the map: "N stays aren't on the map yet". Tapping it shows those stays in the list.
3. **Pin bubbles:** tapping a bubble zooms in. If the stays still overlap at full zoom, show them as a small list to pick from instead of zooming forever.
4. **Fix the Yaba bunching:** list our stays that share near-identical locations on the Location audit admin page so admins can correct them. Nothing gets guessed or moved automatically.
5. **Map tool:** stay with the current free map (no extra cost, already working) and note the change from the PRD in the project notes. Say so if you'd rather switch to MapLibre — that's extra work.
6. **Check on screen:** on phone and PC, check hover highlight, tapping a pin, bubble zoom, the bubble list, the area circle, the "not on the map" line, and that there are no page errors. Then mark Phase 11 fully done in the roadmap.

## Technical notes
- Changes go in `StayPinMap.tsx` (circle layer, bubble picker for overlaps at max zoom), `Explore.tsx` (count of stays with no location and a filter for them), and `src/lib/map-pins.ts` (a tested helper that finds near-duplicate locations).
- Location audit gets a "Shared locations" section that reads the same helper or a read-only database query. No schema change expected.
- Add a vitest test for duplicate-location detection and the circle radius rule.
