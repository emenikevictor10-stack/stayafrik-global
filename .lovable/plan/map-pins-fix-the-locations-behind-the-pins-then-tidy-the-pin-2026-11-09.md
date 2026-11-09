# Map pins: fix the locations behind the pins, then tidy the pins

## What's wrong today
The pins themselves draw correctly. The locations behind them are the problem.

- **Own stays:** 122 of the 123 live stays are saved at the same point, central Lagos. When a host makes a listing, the map starts there, and the pin is saved even if the host never moves it. So nearly every stay, including ones in Port Harcourt or Abuja, shows up in one Lagos pile.
- **Partner stays:** RayProp doesn't send coordinates for any of its 1,364 stays, so the app quietly puts every one of them at that same Lagos point.
- **Something better is already there:** almost every stay has a city (122) and many have a neighbourhood (96). About half of those neighbourhoods have no map point yet.

The result is one huge cluster in Lagos, and the scattering added for privacy just spreads it into a blob.

## The fix

### 1. Stop inventing locations
- Treat the central Lagos default point as "no location". Partner stays without coordinates count as unmapped instead of landing in Lagos.

### 2. Show each stay in its real area
- If a stay has no real pin, place it at its neighbourhood's point. If that's missing too, use the city's point.
- These area pins look slightly different (dashed outline). Tapping one shows "Approximate area" with a wider circle.
- Stays with neither a pin nor a known place stay in the "not on the map" list under the map, as they do today.

### 3. Fill in missing place points
- Run a one-time lookup of the neighbourhoods and cities that have no point, using the free OpenStreetMap place search. It runs slowly to respect their limits, and the results are saved for good.
- Unclear matches go to Admin → Location audit for a person to confirm. Nothing is guessed.

### 4. Make hosts set a real pin
- The new-listing form starts with no pin. The host must search their area or tap the map, and can't save until a pin is placed.
- Hosts whose stay is still at the old default get a "Set your stay's location" prompt in the host portal.
- Location audit gets a "Stays still on the default spot" list.

### 5. Tidier pins
- Clusters show a count, sized by how many stays they hold. Tapping one zooms in, and at full zoom it opens the pick-list.
- The map's opening view ignores stray far-away pins, so it frames where most stays are.
- The highlighted pin always sits on top, and price pins never overlap a cluster bubble.

## Checks
- Tests for: the default point counting as "no location"; the fallback order (real pin, then neighbourhood, then city, then unmapped); and the privacy scatter staying inside the circle.
- Browser check on phone and desktop. Lagos, Abuja and Port Harcourt stays should appear in their own cities, and partner stays should spread by area instead of piling up in Lagos.

## Technical details
- `src/lib/map-pins.ts`: add `isDefaultPoint`, `pinFor(stay, places)` returning `{ point, kind: "exact" | "area" | null }`, and `trimOutliers` for the opening view. `rayprop-map.ts` returns `lat/lng: null` instead of the Lagos fallback.
- Results and Explore get the place points from a public `location_points(ids uuid[])` function (id, lat, lng). Partner stays use `partner_location_map` place ids, local stays use `neighbourhood_id`/`city_id`.
- A one-off `geocode-locations` admin edge function (Nominatim, 1 request per second, User-Agent set, capped per run) fills `locations.lat/lng`. Matches outside Nigeria or of the wrong place type go to the location review.
- `NewListing` drops its default coordinates and the save step requires a pin. Host prompt in the host portal. The default-spot list on `/admin/location-audit` reuses `sharedLocations`.
- Leaflet and OpenStreetMap are kept (no Google Maps). Exact building points still never show before payment.
