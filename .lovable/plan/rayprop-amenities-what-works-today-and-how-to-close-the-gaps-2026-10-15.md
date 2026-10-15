# RayProp amenities — what works today and how to close the gaps

## What the partner API sends (verified against live data, 200 sampled rows)

- Every row has an `amenities` array. About 25% of rows have values; the rest are empty.
- Values are lowercase slugs: `wifi`, `backup_generator`, `en_suite_bedrooms`, `security_cameras`, `parking`, `kitchen`, `gym`, `pool`, `ps5`, `snooker`, `hot_tub`, `24/7 electricity`, etc.
- `building_amenities` exists but was `null` on every sampled row.
- RayProp also sends richer fields we currently ignore: `has_parking`, `parking_spaces`, `has_elevator`, `allows_children`, `allows_pets`, `smoking_allowed`, `suitable_for_events`, `accessibility_features`, `walkability_score`, `minimum_stay`, `advance_notice_hours`.
- Ratings: RayProp sends **no ratings** — "Top rated" can never match partner stays. This is a data limitation, not a bug.

## Current state in the app

- `raypropToProperty` (src/lib/rayprop-map.ts) already maps `amenities` + `building_amenities` into the card's amenities list, so the amenity-based smart filters (`Never dark`, `Work stay`, `Luxury`) already match partner stays — e.g. `backup_generator` contains "generator", `wifi` contains "wifi". Verified working.
- Gaps: slugs display raw to guests ("en_suite_bedrooms"), duplicate variants appear side by side ("streaming" vs "streaming services"), and useful partner boolean fields (parking, elevator, pets, children, events) are unused.

## Plan

### 1. Prettify partner amenity labels — `src/lib/rayprop-map.ts`

Add a `prettyAmenity()` helper used by `raypropToProperty`:

```text
wifi            -> Wi-Fi
backup_generator -> Backup generator
en_suite_bedrooms -> En-suite bedrooms
24/7 electricity -> 24/7 electricity (already fine)
```

Rules: replace `_` with space, title-case words, a small alias map for special cases (wifi → Wi-Fi, ac/a_c → A/C, tv → TV, ps5 → PS5, dstv → DStv, bbq_grill → BBQ grill).

### 2. Dedupe variants

When merging amenities, drop duplicates after normalization ("streaming" vs "streaming services" collapse; "tastefully_furnished" vs "tastefully furnished" collapse).

### 3. Turn partner boolean fields into amenities

In `raypropToProperty`, append labels derived from the structured fields so the filters and detail page pick them up for free:

- `has_parking` → "Parking" (with "2 parking spaces" when `parking_spaces` > 1)
- `has_elevator` → "Elevator"
- `allows_children` → "Family friendly"
- `allows_pets` → "Pets allowed"
- `suitable_for_events` → "Events allowed"

### 4. Widen filter keywords slightly — `src/pages/client/Explore.tsx`

- `power` also matches "24/7 electricity", "24hours power", "electricity" (already there).
- `luxury` also matches "swimming pool", "hot tub", "cinema".
- `family` additionally matches "family friendly" (from step 3).

Only keyword lists change; filter logic stays the same.

### 5. Tests — `src/test/rayprop-catalogue.test.ts`

- Pretty-label conversion cases (slugs, alias map, 24/7 electricity).
- Dedupe case.
- Boolean-field → amenity mapping.
- Power/workstay/luxury keyword matching against a real partner-shaped row.

### Note (no change needed)

"Top rated" stays local-only: RayProp provides no ratings, so partner stays cannot appear there. Nothing to fix on our side.

## Files changed

- `src/lib/rayprop-map.ts` (prettyAmenity, dedupe, boolean fields)
- `src/pages/client/Explore.tsx` (keyword lists only)
- `src/test/rayprop-catalogue.test.ts` (new cases)

No backend, booking, or schema changes.
