# Search: how it works today vs how it should

## How it works today (verified in code)

The "search modal" is the dropdown under the search bar on Explore (`SmartSearchBar.tsx` + `src/lib/location-search.ts`):

1. **Typing** (2+ letters) triggers suggestions after a 220ms pause:
   - **"Places with stays"** — built from the listings already loaded on the page (your own + the ~30 RayProp stays fetched for Lagos, Abuja, Port Harcourt). Each shows stay count and a "Partner" tag.
   - **"More places"** — Google Places autocomplete for anywhere in Nigeria, even places with zero stays. **(To be removed — see below.)**
2. **Empty box** shows Recent searches (last 5, saved on the device) and Popular places chips.
3. **Picking a suggestion or pressing Enter** filters the loaded listings by neighbourhood → city → known-area lookup, ranked best-first. If nothing matches the exact area but the area maps to a known city, it falls back to that city's stays.
4. **"Near me"** uses the phone's GPS to sort by distance.

## Gaps vs how it should work

| # | Today | Should be |
|---|-------|-----------|
| 1 | Suggestions only cover the ~30 partner stays already loaded — a RayProp neighbourhood outside those never appears | Search asks RayProp directly (its search endpoint accepts a text query), so any partner area is findable |
| 2 | Google "More places" suggests places with zero stays — a dead end | **Remove the Google "More places" section entirely** — only real places with stays are suggested |
| 3 | Popular places chips are hardcoded fallbacks (include Enugu/Ibadan/Calabar, which may have no stays) | Chips always come from real loaded places; no hardcoded list |
| 4 | No search while listings are still loading — box looks alive but suggests nothing | Show a subtle "loading stays…" state, then suggestions |
| 5 | RayProp search failures are silent | **Keep them silent** — guests never see a partner-outage note; the feed just shows local stays |

## Plan

1. **Remove Google Places from the search bar** — delete the "More places" section, the Maps/Places loading, and the session-token code from `SmartSearchBar.tsx`. Suggestions come only from real places with stays.
2. **Server-side partner search** — extend the `rayprop-api` search action to accept a free-text `q` and pass it to RayProp's search; Explore calls it (debounced) when the guest types 3+ letters and merges results into the listing list before filtering.
3. **Empty-result rescue** — when a search yields nothing, use the area→city table to suggest "Stays in Lagos" style fallback chips instead of a dead-end message.
4. **Remove hardcoded Popular chips** — always derive from real places; hide the section when nothing is loaded yet.
5. **Loading state** — small status line in the dropdown while listings load.
6. **Silent partner failures** — RayProp errors stay in the console; guests simply see local stays, no warning text.
7. **Tests** — extend `location-search.test.ts` for the fallback-city rescue and empty-query behaviour.

## Technical details

- Files: `supabase/functions/rayprop-api/index.ts` (search action gains `q`), `src/lib/rayprop.ts` (searchRayProp gains query param), `src/pages/client/Explore.tsx` (debounced partner query + merge), `src/components/search/SmartSearchBar.tsx` (remove Google Places, states, chips), `src/lib/location-search.ts` (fallback chips helper), `src/test/location-search.test.ts`.
- No database changes. No changes to booking flow.
