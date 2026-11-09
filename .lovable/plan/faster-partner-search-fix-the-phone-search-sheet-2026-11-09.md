# Faster partner search + fix the phone search sheet

## 1. Fix the "Who's coming" sheet on iPhone (zooming and shaking)
- **Zooming:** iPhones zoom in when you tap a text box with small writing. Make every text box in the search sheet and checkout at least 16px writing size, and stop pinch-zoom from triggering on taps inside the sheet.
- **Shaking:** the sheet slides sideways because something inside it is slightly wider than the screen, and the page behind it still scrolls. Lock the page behind the sheet while it's open, stop sideways movement, and keep the Search button fixed at the bottom.
- Check on an iPhone-sized screen: open search, go through Where → When → Who, tap + / −, and confirm no zoom or sideways wobble.

## 2. Make partner (RayProp) searches load faster
- **Never wait on a refresh:** today, when the 6-hour refresh is due, the first searcher waits while the whole partner list is reloaded. Show the saved copy straight away and refresh in the background.
- **Read less:** keep a slim, search-ready copy (id, title, place, price, beds, photo) instead of loading every listing's full details for each search; full details load only on the stay page.
- **Load the two halves together:** show our own stays immediately and fill in partner stays as they arrive, with loading cards, instead of waiting for both.
- **Remember recent searches** on the phone for a few minutes so going back or changing filters is instant.
- **Date checks only for stays on screen**, run side by side rather than one after another.
- Measure search time before and after and report the numbers.

## Technical details
- Inputs: `text-base` (16px) on mobile in `MobileSearchModal`, `BookProperty`, search inputs; add `overflow-x-hidden` + `overscroll-contain` on the sheet, body scroll lock, `touch-action: manipulation` on stepper buttons, fix any `w-screen`/`100vw` widths.
- `rayprop-api`: background refresh via `EdgeRuntime.waitUntil`; add a `summary jsonb` column (or generated columns) to `partner_catalogue` and select that only; parallel `range()` reads.
- Client: React Query `staleTime` ~5 min on partner search; local and partner queries independent; `Promise.all` for availability.
