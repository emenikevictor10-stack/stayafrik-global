# Airbnb-style search: Where, When, Who

## What guests will see

**Collapsed pill (Explore top)**
- One rounded pill with three parts: "Where · Any week · Add guests" and a round search button.
- After a search it shows the choice, e.g. "Lekki · 12–15 Nov · 2 guests". Tapping any part opens the modal on that step.

**Phone and tablet: full-screen sheet**
- Slides up over the page with an X to close and two tabs at top: Stays (only one for now).
- Three stacked cards. Only one is open at a time; the others collapse to a one-line summary ("Where — Lekki", "When — Add dates", "Who — Add guests").
  1. **Where**: search box plus suggestions from places that have stays (neighbourhoods, cities, states, as today). With nothing typed: "Near me", recent searches, and popular places as large tappable tiles (Lagos, Abuja, Lekki, Port Harcourt…). Picking a place jumps automatically to When.
  2. **When**: a calendar showing two months (scrolls on phone), tap check-in then check-out, plus quick chips "Exact dates / ±1 day / ±3 days" and a "This weekend" shortcut. Picking checkout jumps to Who.
  3. **Who**: steppers for Adults, Children, Infants (+ / −). Pets toggle optional.
- Sticky footer: "Clear all" on the left, big "Search" button on the right.

**Desktop: dropdown bar**
- Wide pill splits into Where | Check in | Check out | Who | Search. Clicking a segment highlights it and opens a floating panel right beneath (places list, two-month calendar, or guest steppers). The bar stays visible and the active segment is shaded, like Airbnb.

**Results**
- Header shows the chosen summary with an edit button; filter chips (Budget, Top rated, etc.) stay below.
- Stays already booked on the chosen dates are hidden; stays too small for the guest count are hidden.
- Prices show "₦X total for 3 nights" when dates are set, plus the nightly price.
- Search is kept in the web address, so refresh, back button and sharing a link keep the same search.
- Opening a stay pre-fills its booking calendar and guest count.

## How it works behind the scenes
- **Where**: same place list and matching as today (local + partner). Partner stays still load only after a search (cost rule kept).
- **When**: local stays are checked against their booked nights; partner stays are checked against RayProp availability for the shown results only (first page, cached), so we don't make hundreds of calls. Stays whose availability can't be checked stay visible and are rechecked at booking (existing protection).
- **Who**: local listings get a "max guests" field for hosts (missing today; defaults from bedrooms ×2 until set). Partner stays use RayProp's guest capacity when provided.
- Recent searches save the whole search (place + dates + guests).

## Build steps
1. New search state (place, dates, flex, guests) synced to the web address.
2. New collapsed pill and the phone sheet with the three steps.
3. Desktop segmented bar with floating panels.
4. Reuse the two-month calendar from booking in the When step.
5. Results: date/guest filtering, total-price display, summary header.
6. Pass dates/guests into the stay page and booking screen.
7. Add "max guests" to host listing form and admin review.
8. Tests: date overlap hides booked stays, guest count hides small stays, total = nights × price, web address round-trips.

## Technical details
- New `src/components/search/SearchModal/` with `SearchPill`, `SearchSheet` (shadcn Drawer/Dialog), `DesktopSearchBar` (Popover), `WhereStep`, `WhenStep` (react-day-picker `numberOfMonths=2`, range mode), `WhoStep`.
- `src/lib/search-state.ts`: parse/serialize `?where=&in=&out=&flex=&adults=&children=&infants=`; pure, tested.
- `Explore.tsx`: replace `SmartSearchBar` usage; filter with `listing_booked_ranges` (batch RPC for visible local ids) and `raypropAvailability` for the first page of partner results (concurrency 5, cached in session).
- Migration: `listings.max_guests int` nullable; NewListing/EditListing field.
- `PropertyDetail`/`BookProperty` read the same query params to prefill.
- Old `SmartSearchBar` removed once replaced; `location-search.ts` reused unchanged.
