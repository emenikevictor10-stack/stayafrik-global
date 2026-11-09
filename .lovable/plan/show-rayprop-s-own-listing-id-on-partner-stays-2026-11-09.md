# Show RayProp's own listing ID on partner stays

## What I found
- RayProp sends its own ID on every stay as `unique_listing_id` (e.g. `1D2C7DUR`). All 1,349 saved partner stays have it, and today it matches their `id`.
- We already use that value, but show it with our own prefix: `RP-1D2C7DUR` / `RP·1D2C7DUR`. So staff and RayProp see different-looking IDs.

## What changes
1. **Show RayProp's ID exactly as RayProp shows it** (e.g. `1D2C7DUR`) on the stay page, admin Bookings, Partner bookings, emails and invoices, with a small "RayProp" label next to it instead of the `RP-` prefix.
2. **Use `unique_listing_id` first** when reading a partner stay (falling back to `id` only if missing), so if RayProp ever makes them differ we keep showing their official one.
3. **Search by it**: pasting a RayProp ID into admin search (with or without the old `RP-`) finds the stay/booking. The stay link and booking lookups use RayProp's listing endpoint (`listing_id` filter), which our partner function already calls.
4. **Update existing records**: booking rows that saved `RP-xxxx` are rewritten to the plain RayProp ID, so old and new look the same.
5. Local stays keep their `SG1234AB` codes unchanged.

## Technical details
- `src/lib/rayprop-map.ts`: `raypropToProperty` reads `unique_listing_id || id`; `partnerListingCode` returns the raw ID; `displayListingCode` stops adding `RP·`; add a `source` badge where codes render (`PropertyDetail`, `AdminBookings`, `AdminPartnerBookings`) instead of inline `.replace(/^RP-/…)`.
- `_shared/partner-fulfil-booking.ts` email text: "RayProp listing ID 1D2C7DUR".
- Internal stay ids stay `rp_<id>` (project rule), only the shown code changes.
- Migration: `update bookings set listing_code = substring(listing_code from 4) where listing_code like 'RP-%'`.
- Admin search strips an optional `RP-`/`RP·` prefix before matching.
- Update rayprop-map tests to assert the plain ID and the `unique_listing_id` preference.
