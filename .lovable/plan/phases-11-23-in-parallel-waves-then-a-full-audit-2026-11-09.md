# Phases 11–23 in parallel waves, then a full audit

You asked to stop going one phase at a time. Thirteen phases can't safely all change the same pages at once, so they run in **4 waves**. Phases inside a wave touch different parts of the app and are built side by side. Each wave ends with tests, the style check and a phone + PC browser pass before the next one starts. The audit you asked for comes after Wave 4.

## Wave A — guest browsing (pages guests see before booking)
- **P11 Map & Explore:** map with every stay as a price pin, list beside it on PC / under it on phone, hovering a card highlights its pin, approximate circles only (never the building).
- **P12 Stay page:** title built from facts ("2-bed apartment in Lekki Phase 1") with the source title under it, listing ID, live nightly price breakdown, power/water/security, house rules, cancellation policy, reviews, area-circle map, full photo gallery at /stays/:id/media, sticky Reserve on phone.
- **P13 Saved lists + compare:** named wishlists in the account (moving device hearts in on sign-in), share links, compare page for up to 3 stays (the compare button from Phase 10 feeds it).
- **P22 SEO:** per-page titles/descriptions, area pages (e.g. /lagos/lekki), sitemap, robots, structured data, WhatsApp link previews, llms.txt, guides pages.

## Wave B — after booking (guest trip + paperwork)
- **P14 Trips:** /trips/:id with a one-line next step, cancel preview page showing the refund before confirming, review page, "find my booking" by reference + email, move-dates request.
- **P15 Invoices:** proforma before paying and paid invoice after, optional company name/tax ID, running invoice numbers, downloadable PDF.
- **P18 Guest details & ID:** /details for name/phone, optional NIN last-4 or passport upload, the existing "ID required" switch, admin ID review with private photo links.

## Wave C — new money flows
- **P16 Split payments:** add co-travellers, invite links, each pays their share via Paystack, booking confirms only when fully paid; unpaid shares expire and are refunded.
- **P17 Add-ons:** catalogue (airport pickup, cleaning, etc.), guest orders paid via Paystack, admin "arrange" queue.

## Wave D — admin, emails, launch
- **P19 Admin sections:** Payments list (flags, CSV), Messages log + resend, Team (moderator view-only), Health (scheduled jobs, webhook errors, RayProp wallet), review replies, Guides editor, Users paging/block.
- **P20 Insights:** period compare, booking funnel, exact earnings, simple charts with a table view.
- **P21 Emails + scheduler:** full email set with listing ID, message log, 5-minute job for holds, host deadlines, reminders, thank-yous, payouts, wallet check, overdue problem alerts.
- **P23 Hardening:** security/access rules review, rate limits, double-charge protection review, 360px/1440px checks, speed check, test-mode journeys.

## What I can't fully prove without you
- **Real payments (P16, P17, P23 journeys):** still need Paystack **test keys** to run a real checkout, split payment, add-on payment and refund. Everything else will be built and checked; these payment steps will be marked "built, not paid-through" until keys are added.
- **RayProp wallet balance (P19 Health):** shown only if RayProp's API exposes it; otherwise marked unavailable.
- Placeholder content I write (guides, area page text, add-on prices) will be flagged for you to replace.

## How progress is tracked
- The task list is updated as each phase finishes, with anything left open and why.
- Short progress notes after each wave.
- Rough size: this is very large; expect several long working turns, not one.

## Technical notes
- Parallel work uses helper agents per phase within a wave; each phase owns its own files/pages, shared files (routes, nav, `AGENTS.md`, `roadmap.md`) are merged by me at wave end.
- Database changes are additive only, with access rules + grants per new table; money logic stays server-side (existing booking/pricing/cancellation helpers reused; split shares and add-ons get their own tested pure helpers).
- Map uses MapLibre with free tiles (PRD), loading only when shown; pins from one lightweight query.
- New emails reuse the existing email queue; the 5-minute job replaces/extends the hourly lifecycle job.
