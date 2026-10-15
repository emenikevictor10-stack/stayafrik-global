# Make search find partner (RayProp) stays reliably

## What I checked
- The live partner connection works: Lagos, Abuja and Port Harcourt each return 10 stays (e.g. Maryland, Ogudu, Lifecamp, GRA).
- Search does not call RayProp. Explore loads 30 partner stays once, then the search box only filters what is already loaded.

## Problems found
1. **Picking a suggestion often shows "No properties match".** Choosing a dropdown suggestion fills the box with the whole address, e.g. "Lekki, Lagos, Nigeria". Search then looks for that exact text, so partner stays listed as "Maryland, Lagos" are missed.
2. **Only 10 partner stays per city.** Searching "Lagos" can never show more than the first 10, and an area outside those 10 (e.g. Lekki) shows nothing even if RayProp has stays there.
3. **The dropdown offers places with no partner stays.** Popular picks include Enugu, Ibadan and Calabar, which RayProp doesn't cover. The page description also mentions Accra, Nairobi and Cape Town.
4. **Search suggestions can't be undone simply.** If a suggestion matches nothing, there's no "show all" or nearby result, just an empty page.

## What I'll change
- **Smarter matching:** split the search into words and drop filler like "Nigeria", "State" and commas. A stay matches if its area or city matches any meaningful word. "Lekki, Lagos, Nigeria" will then show Lekki stays first, then other Lagos stays.
- **Search asks RayProp too:** when the search names Lagos, Abuja or Port Harcourt (or a known area in them), the app fetches up to 30 more partner stays for that city and merges them in, with a small "Loading partner stays…" line. These results are cached, so repeat searches are instant.
- **Dropdown tidy-up:** the popular list shows only areas that have stays (partner cities and cities with your own approved listings). Each suggestion shows a "Partner stays" tag when RayProp covers that city.
- **Empty results:** show "No exact match in Lekki — showing other Lagos stays" instead of an empty page, plus a "Clear search" button.
- Fix the Explore page description to list the cities actually served.

## Booking box for partner stays (reviewed, small fixes)
The step-by-step booking box works as designed: dates, then guest details, then a locked price with VAT and a 15-minute hold countdown, then Paystack. Fixes:
- Show a clear message when the chosen dates are taken (instead of a generic error), and let the guest pick new dates without starting over.
- Check dates are free before asking for guest details, so guests don't type their info for nothing.
- Keep the "Book stay" button disabled while the price is loading, so it can't be tapped twice.

## Technical details
- `src/pages/client/Explore.tsx`: replace the substring filter with a tokenizer (lowercase, strip punctuation, drop stopwords `nigeria, state, lga, fct`), score by area match > city match; fallback list when zero hits.
- `src/hooks/useListings.ts`: expose `loadPartnerCity(city, limit=30)` that calls `searchRayProp`, dedupes by id, merges into state; map area names to city via a small lookup (Lekki/Ikoyi/VI/Maryland/Ogudu → Lagos, etc.).
- `rayprop-api` search: allow `limit` up to 30 (already cached 10 min per city+limit).
- `SmartSearchBar.tsx`: POPULAR list derived from served cities; commit only the main suggestion text plus city.
- `BookProperty.tsx`: call `raypropAvailability` after date pick; map 409 to "These dates were just taken"; guard double submit.
- Add tests for the search tokenizer (e.g. "Lekki, Lagos, Nigeria" matches a Lagos stay in Lekki; "Enugu" does not match a Lagos stay).
