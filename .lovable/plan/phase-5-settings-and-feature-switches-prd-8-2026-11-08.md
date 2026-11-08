# Phase 5: Settings and feature switches (PRD §8)

Admins get one Settings page where they can change prices, time limits and on/off switches without a code change. Every change is saved with who made it and when.

## Admin → Settings (/admin/settings, admins only)
It has sections, and each section has its own Save button.

1. **Switches** (on or off):
   - search fields on Home
   - card payments
   - holds
   - Report a problem
   - ID required before paying
   - maps
   - WhatsApp (off, not built)
   - phone sign-in (off, not built)
   - Mapbox (off)
2. **Money:**
   - service fee on local stays (8%)
   - markup per night on RayProp stays
   - host commission (15%)
   - guest fee on own stays (0%)
   - days after check-in before a payout is due (1)
3. **Time limits:**
   - hold minutes (15)
   - time to pay (60 min)
   - urgent and normal support reply targets (15 and 60 min)
   - host accept hours (24)
   - calendar sync (30 min)
   - instant book default (on)
4. **Contact and alerts:**
   - support email
   - staff alert emails and phones
   - RayProp wallet alert level (₦1,000,000)
   - bank account for transfers
5. **Company and guarantee:** company details for invoices, and the guarantee wording.

A "Settings" item is added to the System group in the admin menu. Moderators can view it but not save.

## What takes effect now
- **Service fee:** checkout and the payment server both read it, so the price shown always matches the price charged.
- **RayProp markup per night:** quotes use it (today it comes from a hidden server value, currently ₦0). I'll start the setting at the current value, not the PRD's ₦5,000, so prices don't change until you decide.
- **Support reply targets:** new problems use them.
- **Report a problem switch:** hides the button on Trips.
- **Search fields switch:** hides the Where/When/Who pill on Home.
- **Maps switch:** hides maps.
- **ID required switch:** stored now; enforced when Your details is built (Phase 18).
- **Support email:** shown on Help.

The rest (hold, payment window, commission, payouts, host accept, iCal, wallet alert, invoices, guarantee) are stored now and wired up by their own phases (6, 7, 9, 15, 21).

## Checks
- Change the fee to 10% and confirm checkout and the server agree. Then reset it to 8%.
- Turn Report a problem off and confirm it disappears. Turn it back on.
- A non-admin cannot save; the database refuses.
- Tests for reading settings with safe defaults when one is missing.

## Technical notes
- **Storage:** new `app_settings` table (key text primary key, value jsonb, updated_by, updated_at), seeded with defaults.
  - RLS: anyone can read non-secret keys (`public` flag); only admins can write, via `private.has_role`.
  - Audit trigger writes to `admin_audit_log`.
- **Front end:** `src/lib/settings.ts` (defaults + typed getters, pure and tested) and a `useSettings()` hook with a cache.
- **Server:** `_shared/settings.ts` reads the table with the service role, falling back to defaults.
  - Used in `paystack-init` (fee), `rayprop-api` (markup, falling back to the old env value) and `create_support_issue` (reply targets read from the table in SQL).
- **Fee calculation:** `BookProperty` reads the fee from settings instead of a fixed 0.08. The server stays the source of truth for the amount charged.
- Rule added to AGENTS.md: business values live in `app_settings`, not in code.
