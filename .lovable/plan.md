# Explore filters + remove the "stays found" count

## How the quick filters work today

The chips under the search box are not sent anywhere as API parameters. They are a local
state array in `src/pages/client/Explore.tsx` (`smart: SmartFilter[]`) that filters the
listings already loaded on the page, one field per chip:

| Chip | Field checked | Rule |
| --- | --- | --- |
| ✨ All | — | clears the array (`setSmart([])`) |
| 💸 Budget friendly | `priceNum` | above ₦0 and at or under ₦100,000 / night |
| ⭐ Top rated | `rating` | 4.5 or higher |
| 👨‍👩‍👧 Family size | `beds` | 3 bedrooms or more |
| 🔌 Never dark | `amenities` | label contains generator, inverter, solar or power |
| 💻 Work stay | `amenities` | label contains wi-fi, wifi or internet |
| 💎 Luxury | `priceNum` or `amenities` | ₦200,000+ / night, or has pool or gym |

Rules are combined with AND (`smart.every(...)`). Two chips also change ordering: Budget
friendly sorts cheapest first, Top rated sorts highest rating first. "Near me" re-sorts by
distance. None of these reach RayProp — the partner endpoint only accepts city, page,
page size and free text, so a chip can only narrow stays already on screen.

## Change: remove the number of listings found

The count appears once on Explore, in the small grey line under the chips when a search is
active: `12 stays for "lekki"`. That number goes away.

What the row becomes:

```text
before:  12 stays for "lekki"            [Clear search]
after:                                     [Clear search]

before:  No exact match for "ikoyi" — showing other Lagos stays   [Clear search]
after:   No exact match for "ikoyi" — showing other Lagos stays   [Clear search]
```

So the search box, the chips, the rescue chips ("Stays in Lagos") and the "Clear search"
button all keep working exactly as they do now — only the tally disappears.

Also removing the leftover `subtitle={...list.length...}` still being handed to the Explore
header. It no longer renders (the subtitle line was deleted from the header earlier), so it
is dead code that recomputes on every keystroke.

## What stays untouched

- Per-place counts in the search dropdown ("Lekki · 312 stays") — those were requested
  earlier and help pick a real place. Say the word and I will drop them too.
- The "N trips" line on My bookings (also not rendered, but on a different page).
- Home page city cards ("N stays") and the "2.4k+ Verified stays" hero stat.
- Every filter rule, sort order, and the partner/local booking flows.

## Technical details

Single file: `src/pages/client/Explore.tsx`

1. Line 105 — `TopBar title="Explore"`: drop the `subtitle` prop.
2. Lines 166-175 — the search-summary row: replace the ternary so the count branch is gone
   and the `fallbackCity` hint renders only when set; the "Clear search" button stays
   unconditional.

No backend, database, or shared-helper changes. No test asserts this text, so the existing
13 checks stay green; I will re-run them and re-check the page in the preview after the edit.
