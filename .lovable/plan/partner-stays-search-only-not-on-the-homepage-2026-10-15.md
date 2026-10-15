# Partner stays: search-only, not on the homepage

## Goal
The Explore homepage shows only your own listings. RayProp partner stays are fetched **only when a guest searches** — no partner API calls on page load. This saves partner API cost.

## How it works today
- `useListings.ts` loads partner stays immediately on page load (page 1 of the catalogue) and mixes them into the homepage feed.
- Infinite scroll keeps loading more partner pages even when the guest never searched.
- Every visitor therefore triggers partner API calls, even those who never search.

## What changes

### 1. Homepage = local listings only
- Remove the automatic partner fetch from the `useListings` initial load.
- The homepage feed, infinite-scroll sentinel, and "That's everything" end state apply to local listings only.
- No partner API call happens until the guest types a search.

### 2. Partner stays load on search only
- When the guest types a search (2+ letters, after the short pause), the app searches local listings **and** calls the partner search once.
- Partner results appear mixed into the results with their "Verified Partner" badge, exactly as they do in search today.
- Scrolling during a search loads more partner result pages (existing infinite scroll, unchanged).

### 3. Reuse what's already loaded ("archived")
- If the guest already searched this session, the partner results stay in memory — clearing the search back to the homepage does **not** refetch anything, and searching again reuses the server's 10-minute catalogue cache rather than hammering the API.
- The single partner listing a guest opened (kept in session storage) is still reused so reopening it costs nothing.

### 4. Search box suggestions
- The "Places with stays" dropdown is built from loaded listings. With no partner stays loaded on the homepage, suggestions initially cover local places; once a search has run, partner places join the suggestions.
- Popular chips fall back to local cities only until a search happens.

### 5. What stays the same
- Property detail pages for partner stays (opened from a link or search) still work — they fetch that one listing directly.
- Booking flow, hold/quote, and payment for partner stays are untouched.
- If RayProp is down, guests simply see local results — no error shown (existing behavior).

## Technical details
- `src/hooks/useListings.ts`: drop the initial `fetchRayPropPage(1)` call and the scroll-driven `loadMore` for the default feed; keep `searchPartner(q)` as the only entry point to partner data; `loadMore` only pages partner results while a search query is active.
- `src/pages/client/Explore.tsx`: hide the "Loading more stays" sentinel when no search is active (or repurpose it for local paging later).
- No backend or database changes. No changes to the partner edge functions.

## Verification
- Load the homepage: confirm zero partner API calls in the network log and only local cards shown.
- Search "Lekki": partner results appear with badges; scrolling loads more.
- Clear the search: homepage shows local only, no new partner calls.
- Run the existing test suite (21 tests) and type check.
