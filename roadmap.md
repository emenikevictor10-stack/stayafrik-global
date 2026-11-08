# Roadmap — Launch readiness (PRD approved 2026-10-15)

- [ ] Phase 0: test local + RayProp sandbox bookings end to end, register webhook, confirm background jobs, RayShortlet manual compare
- [x] Local cancellation + Paystack refunds (guest side)
- [ ] Phase 1 rest: admin refunds, platform settings (fee/markup/policy), reconciliation, dispute hold
- [ ] Phase 2: guest/host/admin emails; WhatsApp alerts (blocked: provider + number)
- [ ] Phase 3: address after payment, receipt, max guests, min stay/prices on calendar, host date blocks
- [ ] Phase 4: admin dashboard money stats, moderation, settings page, CSV exports
- [x] Public listings for signed-out visitors
- [ ] Phase 5 rest: location icon fix, published-site check, security scan

- [x] Admin refund button sends real Paystack refund
- [x] Admin view of 4h viewing reservations + viewing expiry rules

Blocked: Paystack is on LIVE keys (switch to test keys before MVP test bookings); RayProp wallet funding unconfirmed; WhatsApp skipped for launch.
- [x] Admin Listings review + detail/grid view toggle (detail default)
- [x] Admin Users review: confirm all fields mapped
- [x] Admin Bookings: detail view default, search by many fields, gap review vs booking flow
- [x] Admin Partner bookings: detail view + search + gap review
- [x] Admin Payouts: detail view + search + gap review
- [x] Admin KYC: detail view + search + gap review
- [x] Admin Listings detail view: one row per listing with columns
- [x] Answer: what notifications are in place
- [x] Answer: are reservations tracked/admin-manageable

## PRD harmonization (Option B) — PRD wins unless it clashes with what we keep
Keep (clashes): Paystack (not Payaza), Google sign-in + PIN (not email codes), 3-level places, existing table names, 4h viewings.

- [x] P1 Report a problem + Admin Support queue (SLA 15/60 min, Is it fixed?, rating, notes, host contact, offer credit, overdue alert, 24h auto-close, menu count, overview card, trip link). Real end-to-end run waits on a paid test booking (Paystack test keys).
- [x] P2 Design system (statuses as dots, list retry states on main lists, headings, 44px taps, check:ui extended) (§9): Figtree 400/600, blue #275f84 + orange/red tokens, size & radius scales, light default + dark in Account, dot statuses, underlined tabs, 44px targets, wordmark logo, empty/error/skeleton states, check:ui script
- [x] P3 App shell + navigation (§3): phone bottom nav Home/Explore/Trips/Saved/Account + drawer; PC floating dock / pinned sidebar; routes /home /search /results /stays/:id /trips /account (all live) — reconfirmed: dock order Menu then Account, bell in dock menu works
- [x] P4 Admin shell (§5): sidebar/rail, groups, counts, phone ☰, next-step boxes on all detail views, underlined tabs, Try again on all admin lists
- [x] Notifications as bell drop-down (no own page)
- [x] P5 Settings + feature switches (§8): app_settings + Admin Settings; live: service fee, RayProp markup, support reply targets, report_problem/search_fields/map switches, support email. Stored for later phases: holds, payment window, commission, payout delay, host accept, iCal, wallet alert, invoices, guarantee, id_required. Reconfirmed: switches flipped off/on in browser; Explore map now also gated; reply targets 15/60 read from settings. Moderator view-only waits for Team (P19).
- [x] Payout calc uses the host payout saved on each booking (Phase 6)
- [x] P6 Booking lifecycle (§4): unified statuses, booking events timeline, saved markup/commission/host payout per booking, hold 15 min + payment window, release job, overlap constraint
- [x] P7 Own-inventory rate calendar (§5): base/weekend rates, date prices, blocks, min/max nights, cleaning fee, weekly/monthly discounts, instant book vs request-to-book (24h host accept, auto refund), iCal import (host bookings read access added; host calendar lives on Edit listing until P8)
- [x] P8 Host portal (§3): /host home, listings, calendar, requests, bookings (first name only pre-confirm), payouts; /list-your-place
- [ ] P9 Admin Hosts + Payouts (§5): host table, approve/suspend, bank verify (audited), payouts due day after check-in, hold with reason, mark paid with ref, CSV
- [ ] P10 Search & results (§3): /results sort + filters (power, water, verified, rating 4+), 12/page auto-load, no-result suggestions; card spec (no title, heart, compare)
- [ ] P11 Map & Explore (§3): map with all price pins, approximate circles only
- [ ] P12 Stay page (§3): factual title + source title, listing ID, nightly breakdown quote, power/water/security, rules, policy, area circle, gallery /stays/:id/media
- [ ] P13 Saved lists + compare (§3): hearts, wishlists, share links, compare up to 3
- [ ] P14 Trips (§3): /trips/:id with next-step sentence, cancel preview page, review page, find-booking, guarantee/move request
- [ ] P15 Invoices (§3): proforma + paid invoice, company name/tax ID, invoice numbers
- [ ] P16 Split payments (§3): co-travellers, invite links, shares, each pays via Paystack, confirm when fully paid
- [ ] P17 Add-ons (§5): catalogue + orders + Paystack pay + admin arrange
- [ ] P18 Guest details & ID (§3): /details name/phone, optional NIN last-4 / passport, id_required switch, admin ID review w/ signed URLs
- [ ] P19 Admin sections: Payments list (flags, CSV), Messages log + resend, Team, Health (cron runs, webhook errors, RayProp wallet), Reviews reply, Guides CMS, Users pagination/block
- [ ] P20 Insights dashboard (§5): period compare, funnel, exact earnings, SVG charts with table view
- [ ] P21 Emails + scheduler (§12): full template set with listing ID, message log, 5-min cron (holds, host deadlines, reminders, thank-yous, payouts, wallet check, overdue problem alerts)
- [ ] P22 SEO (§10): per-page meta, area pages, sitemap, robots, structured data, WhatsApp link previews, llms.txt, guides pages
- [ ] P23 Hardening + launch checklist (§14): RLS audit, rate limits, idempotency, 360/1440 checks, Lighthouse, test-mode journeys
