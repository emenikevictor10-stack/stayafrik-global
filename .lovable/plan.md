# Search bar rebuilt to match the Airbnb brief

The current search already does Where / When / Who in a pop-up. This rebuild follows your brief closely while keeping Stay's own look and real stays.

## Changes from the brief (on purpose)
- **Brand colours, not Airbnb pink:** the search button uses Stay's green accent; panels follow the current dark theme. Spacing, rounded shapes, shadows and motion follow the brief.
- **Real places, not mock data:** suggestions come from places that actually have stays (States, Cities, Neighbourhoods). There are no London, Paris or Accra suggestions.
- **Results stay on Explore** (the web address keeps the search) rather than a new /search page, so links and the map keep working.
- **Price hints on the calendar** (green = cheaper, red = pricier) show only where we know the nightly price, i.e. partner stays' per-day prices for the place you searched. Otherwise no tints.

## Desktop and tablet (wide screens)
- **Resting bar:** a centred white pill with Where | When | Who, thin dividers, and a round search button, like your screenshot.
- **Active segment:** lifts out as a white pill with a shadow while the rest of the bar turns grey. The search button grows into "Search" with an icon. A small × clears that segment.
- **Panels drop down under the bar** instead of a centred pop-up. They close when you click outside or press Esc.
  - **Where:** "Suggested destinations" rows with tinted icon tiles (Nearby, busiest places). Typing shows a short loading dots animation, then matches with the typed letters in bold. Arrow keys and Enter work. Picking a place moves to When.
  - **When:** a Dates | Flexible toggle.
    - Dates: two months, black circles for check-in and check-out with a grey band between, and a hover preview. Chips: Exact, ±1, ±2, ±3, ±7, ±14 days.
    - Flexible: Weekend / Week / Month plus 12 month cards (pick several). The summary reads like "Week in Nov, Dec".
  - **Who:** Adults, Children, Infants, Pets steppers with the brief's rules. Adding a child, infant or pet sets 1 adult. Limits: 16 guests, 5 infants, 5 pets. There's a "Bringing a service animal?" note.
- **Compact bar on scroll:** after scrolling, the bar shrinks into "Lagos | 8–19 Nov | 2 guests". Tapping it expands the full bar with a light dim behind.

## Phone
- **Resting:** a full-width "Start your search" pill.
- **Opened:** a full-screen grey sheet with a Stays tab and a round ×. It has three white cards, with only one open at a time.
- **When card:** months scroll vertically. Footer is "Skip / Reset" + "Next"; other steps show "Clear all" + "Search".

## How results use it
- **Flexible dates:** shows all stays in the place, sorted by price. It does not hide booked ones, because there are no exact dates to check.
- **±days:** a stay is kept if any shifted date window is free (local booked nights plus partner availability, as today).
- **Pets:** shows only stays with a pet-friendly amenity (partner data has this; local stays need it ticked by the host).

## Technical details
- New `src/components/search/` modules: `SearchBar`, `CompactSearchBar`, `WherePanel`, `WhenPanel` (`DatesCalendar`, `FlexiblePicker`), `WhoPanel` (`GuestStepperRow`), `MobileSearchModal`. These replace `AirbnbSearch.tsx`.
- Shared `SearchProvider` (React context) synced to URL via the existing `search-state.ts`. Extend it with `mode`, `stayLength`, `months[]`, `pets`, and flex values 0/1/2/3/7/14 (backwards-compatible parsing).
- Panels use Radix Popover (portal, outside click, Esc) anchored to the bar. Breakpoints: ≥950 desktop bar, 744–949 the same bar in a compact layout, <744 mobile sheet. Motion: 200 ms fade, slide and scale with Tailwind keyframes.
- New design tokens in `index.css`: `--search-surface`, `--search-muted`, `--search-shadow`, `--search-shadow-open`, plus tints for price hints. No hard-coded colours.
- Calendar: custom grid (date-fns) instead of react-day-picker for range band, hover preview and price tints; aria-labels like "Sunday, 8 November 2026, available".
- Accessibility: segments carry `aria-expanded`/`aria-controls`; Where uses combobox/listbox; focus is trapped in the mobile sheet.
- Price hints: partner availability response (per-day price) for the top 10 partner stays in the selected place; median ±15 % → green/red. Cached per place and month.
- `useSearchAvailability`: add flex-window and flexible-month handling; pet filter.
- Tests: guest rules (auto-adult, max limits, adults can't drop to 0 with kids); summaries ("Week in Nov, Dec", "8–19 Nov ±2", "2 guests, 1 infant, 1 pet"); URL round-trip with new fields; flex window availability.
