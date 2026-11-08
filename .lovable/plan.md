# Finish Phase 1: Report a problem + Support queue

## Where Phase 1 stands against the PRD

Done and checked (pages load, safety checks reject bad requests, rule tests pass):
- Guest "Report a problem" on paid trips: category, urgent switch, note, up to 5 photos
- Guest problem page: thread, status in plain words, "Is it fixed?" yes/no, 1–5 rating once closed, live updates
- "Your problems" list linked from Profile
- Admin Support: Open / Waiting / Closed tabs, urgent first then reply due, search, thread, guest and stay side panel, next-step box
- Staff actions: assign to me, reply (in app + email), internal note (hidden from guest), log host contact, ask "Is it fixed?", mark urgent, close, reopen; every action audited
- Reply targets: 15 min urgent, 60 min normal; admins notified of new problems and guest replies

Not done yet (PRD items still missing):
1. Overdue alert: staff alerted once when a problem passes its reply-due time
2. Auto-close: "Is it fixed?" closes itself after 24 h with no answer
3. "Offer credit" staff action
4. Count of problems needing a reply beside "Support" in the admin menu
5. Admin Overview "needs a person" list includes Support
6. A guest's own reply count/notification link from the trip card (trip shows "Problem open" with a link once reported)
7. Real end-to-end test: no paid booking exists, so a real report has not been run start to finish

Deferred to its own phase (PRD settings): the `report_problem` on/off switch (Phase 5, Settings).

## What to build to close Phase 1

1. Scheduled job every 5 minutes:
   - mark-and-alert overdue problems once (in-app + email to admins)
   - close "Is it fixed?" problems unanswered for 24 h, tell the guest, invite a rating
2. "Offer credit" action: amount (naira) + reason, saved on the problem, shown to the guest as a message, audited. Credit is recorded only (no wallet yet); applying it to a future booking comes with the payments phases.
3. Admin menu badge on Support = open problems needing a reply (red when any are overdue).
4. Admin Overview: add "Problems waiting for a reply" with overdue count, linking to Support.
5. Trips page: if a booking has an open problem, show "Problem P-XXXX · status" linking to it instead of a second report button.
6. Verification: once a paid booking exists (needs Paystack test keys), run report → assign → reply → ask fixed → yes → rate as guest and admin; until then, re-check pages and the safety checks.

## Technical details

- Migration: columns `overdue_alerted_at`, `credit_naira`, `credit_reason` on `support_issues`; function `support_issue_tick()` (security definer, revoked from clients) doing both jobs; `cron.schedule('support-issue-tick', '*/5 * * * *', ...)`; extend `staff_issue_action` with `offer_credit` (validated amount > 0, audited).
- Tests: add cases for the 24 h auto-close cut-off and overdue-once rule in `src/test/support.test.ts` via pure helpers in `src/lib/support.ts`.
- UI: `AdminLayout` badge via a small count query + realtime on `support_issues`; `AdminDashboard` card; `Bookings.tsx` open-problem link.
