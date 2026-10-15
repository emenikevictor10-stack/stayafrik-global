# Load the full RayProp catalogue (fix "only a few Abuja stays")

## What we found
- Asking RayProp for Abuja stays (up to 50) returns only **8** — in Gwarimpa, Lifecamp, Guzape. No paging info comes back.
- So the gap is in what RayProp returns for `city=Abuja`, not in our search box.
- Likely causes (not yet confirmed): many RayProp stays are labelled with a different city name (e.g. "FCT", "Federal Capital Territory", "Wuse", "Lekki", "Ikeja"), or they sit in cities we never ask for. Today we only ask for exactly "Lagos", "Abuja" and "Port Harcourt".

## What we'll build
1. **Find out how RayProp labels its ~1000 stays (first step).** Call RayProp's listings without a city filter (and try the city/state variants), page through, and count stays per city/state. This tells us the real names to use.
2. **Fetch by every real place, not 3 fixed names.** The server builds the list of cities/states from step 1 and pulls each one, so Abuja searches include stays labelled "FCT", Wuse, Maitama, etc.
3. **Map variants to one city** in search: FCT / Federal Capital Territory / Abuja areas → Abuja; Lekki, Ikeja, VI, Yaba… → Lagos. Typing "Abuja" shows all of them.
4. **Search hits the full catalogue.** When a guest searches a city, the server returns every matching stay (paging through RayProp until empty), cached 10 minutes, so results aren't limited to what's already loaded on Explore.
5. **Infinite scroll keeps working** across the full catalogue.
6. If RayProp's API truly caps results per request with no way to page, we'll report the exact limit and ask RayProp for the bulk/paged endpoint.

## Technical details
- `_shared/rayprop.ts`: allow `raypropSearch` without city; support whichever paging param RayProp honors (`page`, `offset`, `cursor`), detected in step 1.
- `rayprop-api`: replace fixed `CITIES` set with a dynamic place index (cached); new `catalogue` mode that aggregates pages server-side; `search` accepts `q` and resolves aliases before calling RayProp.
- `location-search.ts`: extend `AREA_CITY` / `CITY_STATE` aliases (FCT → Abuja etc.); tests for "abuja" matching FCT-labelled stays.
- `useListings.ts`: use the dynamic place list instead of `RAYPROP_CITIES`.
