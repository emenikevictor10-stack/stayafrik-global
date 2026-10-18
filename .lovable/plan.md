# Phase 2: Search suggestions and results powered by the place list

The search bar, the small bar that sticks to the top when you scroll, and the phone search screen all keep their current look and steps. What changes is how **Where** finds places and how results are filtered.

## What guests will see
- **Suggestions as you type**, starting from the 2nd letter. Each place appears once, never twice:
  - "chev" → Chevron (Lekki, Lagos)
  - "lek" → Lekki, Lekki Phase 1, Lekki Phase 2
  - "vi" → Victoria Island
  - "ikoy" → Ikoyi
  - "abu" → Abuja (FCT), then Abuja neighbourhoods
  - "chevorn" (a typo) → Chevron
  - "xyzq" → "No places match 'xyzq'", with popular destinations shown below
- **Each row:** an icon (pin for a neighbourhood, building for a city, map for a state), the place name with the typed letters in bold, and where it sits, e.g. "Lekki, Lagos".
- **Stays group:** up to 3 matching stay titles under the places (e.g. "Chevron Luxury 2-Bed"). Tapping one opens that stay directly.
- **Before typing:** Nearby, "I'm flexible — search all of Nigeria", your last 5 picked places, then popular destinations ranked by how many stays they have.
- **Smoother typing:** the previous results stay on screen while new ones load (with three dots), so the list never flickers.
- **Keyboard:** ↑/↓, Enter, Esc and Tab work. On phones the box gets a back arrow and a clear (×) button.
- **Picking a place** moves you on to When.
- **Results:**
  - Picking Lagos shows every Lagos stay. Picking Lekki includes Chevron, Lekki Phase 1 and the rest. Picking Chevron shows only Chevron.
  - This applies to your stays and partner stays alike, with no duplicates.
  - If you press Search without picking, the top suggestion is used. If there is none, the app searches addresses instead.
  - The heading reads "Stays in Chevron, Lekki". Refreshing or sharing the link keeps the search.
- **Who panel** gets a **Bedrooms (minimum)** stepper, which shows "Any" at 0. Pets stays.

## Where this differs from the brief, based on your earlier choices
- **No stay counts** in suggestions or results headings. You asked earlier to remove both. Popular destinations are still ranked by count, but the numbers are hidden.
- Results stay on the Explore page instead of moving to a new /search page. The link uses the brief's names (`loc`, `loc_type`, `checkin`, `checkout`, `adults`, `children`), and older shared links keep working.
- Stay's green-and-dark colours are kept instead of the pink in the brief.

## Technical details
- **New `search_locations(q, limit)` function:**
  - Matches on name and other spellings.
  - Ranks: exact match, then name starts with the typed text, then a word starts with it, then other spellings, then close spellings (`pg_trgm` ≥ 0.3 for short typed text).
  - Ties go to the place with more stays, and neighbourhoods/cities come before states.
  - Returns only places with stays (switchable), one row per place, with the full place path included.
- **New `search_stays(q, limit 3)` function** over local listing titles plus partner titles in `partner_location_map`.
- **Client:**
  - `useLocationSearch(q)`: 150 ms pause after typing, cancels the previous request so results never arrive out of order, keeps the previous results while loading.
  - A new `LocationSuggestionRow` replaces the old place-index suggestions in `WherePanel`.
  - Recent picks are saved in localStorage under `stay:recent-places`.
- **Search state:** `where` now holds `{ location_id, slug, type, label }` instead of free text, plus `bedrooms`. `parse/serialize` reads both the new and old link names.
- **Filtering:**
  - Your stays filter on `state_id/city_id/neighbourhood_id`, read alongside the listings.
  - `rayprop-api` search accepts `location_id` and filters its catalogue cache using a cached copy of `partner_location_map`, giving the same top-down match for partner stays.
  - Results are merged and de-duplicated by id.
  - Free text with no pick falls back to the current `raypropMatches` / `searchProperties` text matching.
- **Tests:**
  - The test cases above run against the live place functions as a script.
  - Vitest covers link reading and writing, and the guest/bedroom rules.
  - A preview check: search "chev", pick Chevron, confirm only Chevron stays (yours and partner) appear.
