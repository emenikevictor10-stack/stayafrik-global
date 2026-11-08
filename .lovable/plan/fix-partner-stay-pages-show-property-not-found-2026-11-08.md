# Fix: partner stay pages show "Property not found"

## What's actually wrong
This is not a broken link. RayProp has **suspended our access key**. Every partner request now gets back "Access temporarily suspended due to policy violations" (code API_KEY_BLOCKED), as of 21:58 UTC today. That is why rp_316281JR won't open, and partner stays are missing from search too. Local stays still work.

The likely cause is how we load RayProp's catalogue. Every time our server restarts, it fetches all ~27 pages of the catalogue, six pages at a time. The cache is lost on each restart, so this happens often, and RayProp probably saw it as abuse.

## What you need to do (I can't do this part)
Ask RayProp (ezekiel@rayprop.io) to lift the block. Tell them we are cutting our request volume (below), and ask what their rate limit is.

## What I'll build
1. **Clear message for guests.** A partner stay that can't load shows "This stay is temporarily unavailable. Browse other stays" instead of "Property not found". Local stays are unaffected.
2. **Stop hammering when blocked.** If RayProp says we are blocked or rate-limited, pause all partner calls for 30 minutes and show local stays only. Admins see a "RayProp paused: access blocked" notice on the Partner bookings page.
3. **Save the catalogue in our own database.** A full refresh then runs at most once every 6 hours, instead of on every server restart. Pages are fetched one at a time with a short pause between them. Search and stay pages read the saved copy, so opening a partner stay link makes no RayProp call at all.
4. **Fetch on demand only.** We still call RayProp live for dates, prices, holds and booking, because those must be current.

## Checks
- With the block still active: the partner stay page shows the friendly message, Explore shows local stays, and the logs show only one blocked attempt per 30 minutes.
- Once RayProp lifts the block: a refresh fills the saved copy, rp_316281JR opens straight from its link, and search returns partner stays.
- Unit tests for the pause rule and the refresh timing.

## Technical details
- New table `partner_catalogue` (`rayprop_listing_id` pk, `record` jsonb, `refreshed_at`) with RLS: service role writes, no client access. There is also a row in `app_settings` or a small `partner_sync_state` row holding `last_full_refresh_at` and `blocked_until`.
- `rayprop-api` `loadCatalogue`: memory cache, then the DB copy, and a refresh only if it is older than 6 hours and `blocked_until` has passed. The refresh runs sequentially with a pause of about 300ms per page.
- `raypropFetch`: on 403 API_KEY_BLOCKED or 429, set `blocked_until = now()+30m` and short-circuit later calls with `{ disabled: true, reason: "paused" }`.
- `useListing` (rp_): passes a distinct "unavailable" state to PropertyDetail.
- Pure pause and refresh helpers go in `_shared/rayprop-core.ts`, with vitest coverage.
