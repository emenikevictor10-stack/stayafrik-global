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
- [x] P8 Host portal (§3): /host home, listings, calendar, requests, bookings (first name only pre-confirm), payouts; /list-your-place. Reconfirmed: all host pages load signed in with no errors.
- [x] P9 Admin Hosts + Payouts (§5): host table, approve/suspend, bank verify (audited), payouts due day after check-in, hold with reason, mark paid with ref, CSV. Done: /admin/hosts, staff_host_action/staff_payout_action, payout_block_reason gate, host hold/ref view. Real transfer waits on Paystack test keys.
- [x] P10 Search & results (§3): /results sort + filters (price, beds, type, power, water, verified, rating 4+) in the link, 12/page auto-load + More stays, no-result nearby areas + nearest dates; PRD card (no title, heart, compare kept on device until P13)
- [x] P11 Map & Explore (§3): free OSM map (Leaflet, not MapLibre — kept: free and working), price pins at approximate points, ~800 m area circle on hover/pick, bubbles zoom in and show a pick-list when stays still overlap, stays without a location listed under the map, admin 'Stays sharing one map spot' list on Location audit. Rechecked on phone/PC. Open data issue: 126 local stays share one saved point (around 6.5244 latitude) and need real locations from hosts.
- [x] P12 Stay page (§3): factual title + source title, listing ID, price for searched dates (nightly, discount, cleaning, fee, total), power/water/security, rules, cancellation policy, area-only map, /stays/:id/media gallery. Close-out 2026-11-09: area map on free map with approximate centre, partner date price, date price on phones, Secure Escrow wording.
- [x] Search page clean-up: centred search, only Filters + Map beside it; sort/shortcuts moved into Filters
- [x] P13 Saved lists + compare (§3): hearts sync on sign-in, named lists (create/rename/delete), share /w/:token (+ old /saved/shared), join/leave/remove members, /saved/:id, /compare?ids= link + copy, floating Compare (N) bar. Closed 2026-11-09.
- [x] P14 Trips (§3): /trips tabs Upcoming/Past/Cancelled, /trips/:id next step + check-in details (host "How guests get in", shown only once confirmed), cancel with refund preview + reason, review with stars/tags/note, /trips/:id/move StayGlobal guarantee (during stay, similar free stays, goes to support queue), /trips/:id/guests, /help/find-booking, move-dates request (+ /admin/date-changes)
- [x] P15 Invoices (§3): proforma + paid, numbers SG-INV-YYYY-NNNNNN, company/tax ID (clearable), billed-to guest, paid extras as lines, company details from Settings, Invoices switch, staff Issue invoice, print shows invoice only.
- [x] P16 Split payments (§3): local stays, 2–6 people, /pay/share/:token links, confirm when all paid, hourly refund of paid shares if time runs out; custom amounts, names/emails, card or bank transfer per share, remove/remind, reminders, admin share view. Bank-transfer split tested end to end; card share untested (no Paystack test keys).
- [x] P17 Add-ons (§5): PRD catalogue (4 extras, placeholder prices, optional city), stages paid→confirmed→done / refund_due→refunded, guest cancel, card or bank transfer, refunded with stay cancel, booking timeline + Insights. Real card payment untested.
- [x] P18 Guest details & ID (§3): /details + /details/passport, server-side id_required gate in paystack-init (pending/approved only), submit_guest_id / staff_kyc_action RPCs, guest alerts, next-stay sort
- [x] P19 Admin sections: /admin/payments (flags, search, CSV), /admin/messages (email log; failed retry automatically — no manual resend), /admin/team, /admin/health (jobs, emails, stuck money, partner pause), /admin/addons, /admin/date-changes. Closed: staff public reply per review (shown on stay page), /admin/guides editor (guides from database), block/unblock users (stops pay, viewings, messages), Settings admin-only (page + server). Open: partner wallet balance (blocked: RayProp has no balance API).
- [x] P20 Insights (§5): full PRD dashboard — 7/30/90/month/year/custom (Lagos), 4-measure headline line vs before, 5-step funnel, exact earnings + refunds, pay mix, 6 tiles, stay length/check-in day/lead time, next 30 days, top areas/stays, source split, sign-ups + Guests; Table on every chart. Checked with test bookings (removed).
- [~] P21 Emails + scheduler (§12): lifecycle job now every 5 min incl. check-in reminders (with listing ID), thank-yous, host 4h deadline nudges, support overdue checks; nightly job-history purge. NOT done: full branded template set (alerts still use the one simple layout), wallet check.
- [x] P22 SEO (§10): per-page meta (client), /stays-in/:slug area pages (135 in sitemap), /guides (placeholder copy to review), robots disallows private pages, structured data, llms.txt, site meta updated. Crawler-visible per-page meta needs server rendering (not in this setup).
- [~] P23 Hardening (§14): closed public access to email-sending and internal database helpers (anyone could previously trigger emails); trigger helpers locked. NOT done: rate limits, Lighthouse, full test-mode payment journeys (need Paystack test keys).
- [x] Split Users and Team: team invites with roles (admin, support, finance, listings), change roles, remove admins (no self/last-admin removal); menu and pages limited per role. Edge functions that check admin (e.g. Paystack transfers) still need the Admin role.
- [x] Map pins: fake default points removed, area fallback (neighbourhood/city), place points filled (22 to review), required host pin (OSM picker), host prompt, cluster bubbles.
