# Bell drop-down + Phase 4 (Admin console layout)

20 phases remain after Phase 3 (Phases 4 to 23).

## Part A — Notifications open from the bell, not their own page
- Tapping the bell opens a drop-down panel right under it: newest 20 notifications, each with its title, a short line and the time ("5 min ago"). Unread ones show a blue dot.
- Tapping a notification marks it read, closes the panel and goes to the right page (trip, message, payout…).
- "Mark all as read" sits at the top of the panel. When there are none: "You're all caught up".
- Phone: the panel opens as a sheet from the top, full width. PC: the bell sits in the dock and its menu, and opens a floating panel next to the dock.
- The old Notifications page address forwards to the page you came from and opens the panel, so old email links still work.

## Part B — Phase 4: Admin console layout (PRD §5)
**PC**
- A 248px sidebar with grouped sections:
  - **Today:** Overview, Support, Bookings, Viewings
  - **Stays:** Listings, Partner bookings, Reviews, Location audit
  - **People:** Users, KYC (ID review), Payouts
  - **System:** Audit log
- It collapses to a 72px icon rail; your choice is remembered on this device.
- Counts that need someone show beside each section, as a dot plus a number: Support waiting, Listings pending, KYC waiting, Payouts due, Viewings pending, Partner bookings needing attention.
- An account menu at the bottom: your email, Back to StayGlobal, Sign out.
- Pages sit in a fitted 1040–1240px column.

**Phone**
- A top bar with the page title and ☰ menu, holding the same grouped sections and counts. This replaces today's sideways-scrolling pill row.

**Next-step box on every detail screen**
- At the top of each detail view: the status as a dot plus words, one plain sentence of what is happening, and the one button that does the job. It is tinted only when staff must act.
- Applied to Listing review, Booking, Partner booking, Payout, KYC, Viewing, Support and User detail. Example sentences:
  - "Nobody at StayGlobal has checked this place yet." → Approve
  - "Payout of ₦92,000 to Ada is due. Send it, then mark it paid." → Mark paid
  - "Ada sent an ID today. Check it matches their name." → Approve ID
  - "Nobody has picked this up yet. Ada reported it 2 h ago." → Assign to me
- List filters on admin pages become underlined tabs.
- Also adds the missing "Try again" to admin Listings and Support.

## Steps (one at a time, checked in the browser)
1. Bell drop-down (phone sheet and PC panel), forward the old address, remove the page from the menu.
2. Admin sidebar: groups, collapse to rail (remembered), account menu, counts.
3. Admin phone top bar with ☰ menu.
4. Shared next-step box, then add it to each detail screen.
5. Underlined-tab filters and "Try again" on the remaining admin lists.
6. Verify at 360px, 768px and 1280px, signed in as admin: bell panel opens and marks read; rail collapse survives a reload; counts match the database; every detail view shows its next step.

## Technical notes
- New `NotificationsBell` uses the existing `useNotifications` hook, built on Popover (PC) and Sheet (phone). `/notifications` becomes a redirect that opens the panel through a URL flag.
- New `useAdminCounts` hook runs one count query per queue (head-only counts) and refreshes every 60s. It reuses `useSupportQueueCount`.
- Rail state is kept in localStorage `sg-admin-rail`.
- New `NextStep` component in `src/ui/kit.tsx` (tone, sentence, action). A pure `nextStepFor(kind, row)` helper per screen gets small tests for the sentence and button choice.
- Admin nav groups are defined once in `components/admin/adminNav.ts`. The rule goes into AGENTS.md.
