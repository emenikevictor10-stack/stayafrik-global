# Stay — v1.1 Plan (Shortlet focus)

Big batch of changes grouped by area. Items in the order I'd ship them.

## A. Auth & onboarding

1. **Skip splash for returning users.** `Welcome` only renders on first sign-in. Persist `stay:onboarded:{user.id}=1` (already exists) but also flip the flag for users who already have any data (e.g. profile `created_at` older than session). New users → `/welcome`, existing → `/explore`.
2. **Sign-in pin (PIN code) alongside Google.** Add a 4-digit PIN as a *local-device* secondary unlock after successful Supabase login. Stored as SHA-256 hash in `localStorage` per user. Settings entry to set/reset PIN. Asked once per app open. (Not a replacement for password — it's a quick re-auth on a trusted device, common in fintech/shortlet apps.)
3. **Email/password sign-in already exists** — verify it works end-to-end and surface "Forgot password" clearly.

## B. Notifications

4. **`/notifications` page** + bell entry in TopBar with unread dot.
   - New table `notifications` (id, user_id, type, title, body, link, read_at, created_at) with RLS (user reads/updates own).
   - Triggers: booking created/updated → notify host; message received → notify receiver; listing verified → notify host.
   - Realtime via Supabase channels for live unread count.

## C. Chat

5. **Wire `Messages` + `ChatThread` to the real `messages` table** (currently mocked). 
   - Threads list from distinct `(sender_id, receiver_id)` pairs.
   - Insert on send, realtime subscribe on receive, mark-as-read on open.
   - Profile join for names/avatars; deep link from PropertyDetail "Message host".

## D. PWA manifest

6. **Regenerate icons** so the file dimensions match the manifest:
   - `icon-192.png` → exactly 192×192
   - `icon-512.png` → exactly 512×512
   - `icon-maskable.png` → 512×512 maskable
   - New `shortcut-96.png` → exactly 96×96, used for all 3 shortcuts.
   - Update `manifest.webmanifest` accordingly.

## E. Shortlet-only positioning (v1)

7. **Hide rental & buy/sale UI** across Explore filters, listing types, copy ("homes and land" → "shortlets"). Keep DB columns untouched; just default `listings.type = 'Shortlet'` and remove the type picker from New Listing for now. Update manifest description + welcome slides copy. Plan: re-enable in v2 behind a feature flag.

## F. Payments

8. **`/profile/payment-methods` page** for clients:
   - List saved methods (`payment_methods` table: id, user_id, brand, last4, exp, is_default).
   - Add (card form — store metadata only, no real PCI flow yet; placeholder for Paystack/Stripe later), set default, remove.
   - Wire entry from Profile menu and from `BookProperty` checkout step.

## G. Google Maps

9. **Connect Google Maps Platform connector**, replace the current `PropertyMap` (Mapbox/placeholder) with the Maps JS API using `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY`.
10. **Geocode on listing create/edit** (server-side via gateway from an edge function) so `listings.lat/lng` is populated automatically from `address + city`.
11. **Browser autocomplete** (Places API New `AutocompleteSuggestion`) on the address field in New/Edit Listing.

## H. Agent section

12. **Auto-verify bank account name on entry.** In `PayoutAccount`, when bank + account number are filled, call an edge function `verify-bank-account` that hits a Nigerian bank-account resolution provider (Paystack `/bank/resolve`). Display the resolved name; require the user to confirm before save. *(Needs a `PAYSTACK_SECRET_KEY` — I'll ask before wiring.)*
13. **Basic KYC**: government-issued ID only. New table `kyc_submissions` (user_id, id_type, id_number, id_image_url, status, reviewed_at). Storage bucket `kyc-documents` (private, owner-only RLS). 
14. **`/profile/verification` page**: upload front of ID, enter ID number, submit. Show current status (pending / approved / rejected) with timeline.
15. **Listings save reliability.** Audit `NewListing` + `EditListing`: required-field validation, optimistic state, toast on error with the real PostgREST message, retry. Make sure `host_id = auth.uid()` is always set and `images[]` is the uploaded public URLs (not blob URLs).
16. **Role-swap bug.** `RoleProvider` currently starts in `client` and only updates from `ProtectedRoute`'s async query. Fix: persist `role` in `localStorage`, hydrate synchronously, and make `setRole` write through. Also gate `SecondTab`/`ThirdTab` on `roleReady` to avoid the flash to Explore/Bookings before user_roles loads.

---

## Implementation order

I'd ship in 3 commits so the preview stays usable:

- **Commit 1 — Foundations**: H16 role-fix, A1 splash gate, A3 password polish, D6 icons, E7 shortlet copy.
- **Commit 2 — Data features**: B4 notifications, C5 chat wiring, F8 payment methods, H13/H14 KYC, H15 listing save audit.
- **Commit 3 — External services** *(need confirmations)*: G9–G11 Google Maps (will trigger the connector flow), H12 Paystack bank-resolve (needs `PAYSTACK_SECRET_KEY`), A2 PIN unlock.

## Questions before I start

1. **Paystack** for bank-name verification — OK to use? You'll need to paste `PAYSTACK_SECRET_KEY` when I ask.
2. **PIN scope** — local device-only unlock (my recommendation), or do you want it server-side as a real auth factor?
3. **Notifications scope** — in-app only for v1, or also browser push? (Push needs more PWA work.)
4. **Payment Methods** — UI shell + storage only for now (no real charges), and we wire a real provider in v2? Or do you want Paystack/Stripe live now?
