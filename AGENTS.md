# Project rules

- RayProp partner listings use ids prefixed `rp_` and `source: "rayprop"`; all RayProp calls go through the `rayprop-api` edge function (x-api-key stays server-side). Why: keeps the key secret and lets local listings work when RayProp is off.
- RayProp amounts are kobo; convert only via `koboToNaira` (`src/lib/rayprop-map.ts`, `_shared/rayprop-core.ts`). Why: avoids 100x price bugs.
- Partner bookings are reserved and wallet-paid server-side in `paystack-verify` after Paystack succeeds; failures are saved as `needs_attention`, never dropped. Why: a paying guest must always have a booking record.
- Pure RayProp helpers live in `_shared/rayprop-core.ts` (no Deno APIs). Why: vitest can test them.
- `rayprop-api` loads the whole RayProp catalogue (all pages, unfiltered) into a 10-minute server cache and serves search/paging from it; text matching lives in `raypropMatches` (`_shared/rayprop-core.ts`). Why: RayProp city filters miss stays labelled by area/state (e.g. FCT).
