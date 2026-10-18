# States, cities and neighbourhoods — one shared structure

## How it works today
- **Partner stays (RayProp)** come with three separate place fields: `state`, `city`, `neighborhood`. Live examples: Lagos / Magodo / Magodo GRA, Lagos / Lekki / Chevron, Lagos / Surulere / (blank). RayProp's "city" is often a district (Lekki, Magodo), and its "state" is the real top level.
- **Your own stays** only store a free-text City and an address. There is no State or Neighbourhood field. (The "Area" field on the listing form is actually floor size, e.g. "180sqm".)
- The app ignores RayProp's `state` when building suggestions. It guesses states from a short hard-coded list of 10 cities, so "Lekki" or "Magodo" never link to Lagos State. Neighbourhoods for your stays are guessed from the address text.

## What I'll build
Use RayProp's structure everywhere: **State → City → Neighbourhood**.

1. **Your listings get the same three fields.**
   - New listing and Edit listing: a **State** dropdown (all 36 states + FCT), then **City** (suggestions from places that already have stays in that state, free text allowed), then an optional **Neighbourhood**.
   - Existing listings are filled in automatically from their current city and address (e.g. City "Lekki" → State Lagos). Admins can correct any that are wrong on the listing review page.
2. **Partner stays keep RayProp's own values**, cleaned up: "FCT" / "Federal Capital Territory" → "FCT Abuja", consistent capital letters, blank neighbourhood left empty.
3. **Search suggestions built from the real fields**, grouped as States, Cities and Neighbourhoods:
   - "Lagos" shows Lagos State, plus cities such as Lekki, Ikeja and Magodo.
   - "Chevron" shows "Chevron, Lekki · Lagos".
   - Each suggestion carries its level, so picking one filters exactly: a state shows every stay in that state, a city every stay in that city, a neighbourhood only that neighbourhood.
4. **Display:** cards and listing pages show "Neighbourhood, City" with the state underneath where helpful. The exact address stays hidden until after payment, as today.
5. **Admin listings:** filter by state and city.

## Technical details
- Migration: `listings.state text`, `listings.neighborhood text` (nullable) + index on `(state, city)`; backfill via a SQL CASE built from a city→state lookup (Lagos areas, Abuja areas, PH, etc.).
- `src/lib/nigeria-places.ts`: list of states + FCT, alias/normalise helpers (`fct`, `federal capital territory` → `FCT Abuja`; `vi` → `Victoria Island`), area→state lookup used for backfill and fallback. Also mirrored in `_shared/rayprop-core.ts` for `raypropMatches`.
- `Property` gains `state?`, `neighborhood?`; `rowToProperty` and `raypropToProperty` fill them (RayProp: `raw.state`, `raw.city`, `raw.neighborhood`).
- `location-search.ts`: `buildLocationIndex` uses the real fields (state → city → neighbourhood, with parent links), drops the hard-coded `CITY_STATE`/`AREA_CITY` guessing except as fallback; `searchProperties` accepts a structured pick `{kind, name, parent}` stored in the web address (`where`, `wk=state|city|area`).
- Server partner search: `raypropMatches` matches on state/city/neighbourhood using the same normaliser so "Lagos" finds Lekki/Magodo stays.
- `NewListing.tsx`/`EditListing.tsx`: State select + City combobox + Neighbourhood input; validation requires State and City.
- `AdminListings.tsx`: state/city filters and editable place fields on review.
- Tests: FCT normalisation; "Lekki" city links to Lagos State; picking a state includes all its cities; picking a neighbourhood excludes other neighbourhoods; backfill lookup maps known areas.
