# Phase 1: Tag every listing with a state, city and neighbourhood, and add an audit page

Your brief says to stop after Phase 1 and show you the audit. This plan covers Phase 1 only. Phase 2 (rebuilding the search suggestions on top of the new place list) gets its own plan after you've reviewed the audit.

## What you'll get
1. **One master list of places.** It holds every state, city/area and neighbourhood, nested like this: Lagos → Lekki → Chevron, and FCT → Abuja → Wuse / Maitama / Gwarinpa. Each place has alternative spellings, e.g. "VI" means Victoria Island, "Lekki Ph 1" means Lekki Phase 1, "Chevy" means Chevron and "FCT" means Abuja. It starts with the main areas of Lagos, Abuja, Port Harcourt and Ibadan, and the same place can never be added twice under the same parent.
2. **Every listing linked to a place.** This covers your own listings and partner stays.
   - The app first matches the listing's address and area text against the place names and their alternative spellings. Close misspellings also count.
   - If that fails, it uses the listing's map pin and picks the nearest neighbourhood within about 1.5 km.
   - Linking a listing to Chevron also links it to Lekki and Lagos automatically.
   - When the app isn't confident about a match, it doesn't guess. The listing goes into a review list instead.
3. **Audit page for admins**, under Admin → Location audit:
   - Totals for your own stays and partner stays: how many have a state, a city and a neighbourhood, and how many are missing each one.
   - A review list of untagged or uncertain listings. Each one shows the raw address, the suggested place and how confident the match is, plus a search box to confirm or fix it. Fixes save straight away.
   - The duplicate names found and which single place each was merged into, e.g. "Chevron, Lagos", "Chevron Drive" and "Chevron, Lekki" all become Chevron.
   - A listing with a state and city counts as complete when its city has no neighbourhoods listed yet.
4. **Keeping it clean from now on:**
   - The host listing form picks State, City and Neighbourhood from the master list instead of free typing. A listing can't be saved without a state and city.
   - Every partner stay is matched as it comes in. Stays that can't be matched go into the review list and are still shown to guests, never dropped.
   - Each night the app recounts how many active stays each place has. Phase 2 uses this count to rank suggestions.

## Technical details
- New `locations` table: id, name, slug, type (state/city/neighbourhood), parent_id, aliases text[], lat, lng, is_active, listing_count.
  - `pg_trgm` index for close-spelling matches, and a unique index on (lower(name), parent_id).
  - Grants: read for anon and authenticated users; writes for admins only, through `has_role`.
- `listings` gets nullable `state_id`, `city_id`, `neighbourhood_id`, `location_confidence` and `location_status` ('ok' | 'review'). The existing `state`, `city` and `neighborhood` text columns stay in place and are kept in sync.
- New `partner_location_map` table: rayprop_listing_id, the three ids, confidence, status, raw text and updated_at. It acts as a cache keyed by the partner's listing id, because partner stays aren't stored in your database.
- A SQL function `match_location(text, lat, lng)` returns the best place and a confidence score. The order is exact name or alternative spelling, then close spelling (similarity ≥ 0.4), then the nearest map pin. Below 0.6 the listing goes to review.
- A `location-backfill` edge function, run by admins, tags local listings and the cached partner catalogue in one go. After that, `rayprop-api` looks up the cache for each catalogue load and matches only partner stays it hasn't seen before.
- `refresh_location_counts()` runs nightly through pg_cron.
- New admin page `/admin/location-audit`, plus a `PlaceFields` rewrite using a combobox that searches the place list.
- Tests check how place text is cleaned up and that each listing gets its parent city and state.
