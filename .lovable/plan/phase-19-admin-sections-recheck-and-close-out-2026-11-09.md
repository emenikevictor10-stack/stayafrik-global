# Phase 19 (admin sections): recheck and close-out

## Where it stands
These admin pages are built and linked: Payments, Messages (email log), Team, Health, Add-ons and Date changes.

The roadmap marks these items as never built:
1. **Reply to reviews**: staff can read reviews but can't post a public reply.
2. **Guides editor**: help guides are fixed text that only a code change can update.
3. **Block a user**: there's no way to stop a guest or host from booking or signing in.
4. **Partner wallet balance**: RayProp offers no way to read it, so this stays blocked.

Phase 5 also left this for Phase 19:
5. **View-only Settings**: support, finance and listings staff can open Settings, but only admins should be able to save. This hasn't been checked.

Messages has no manual "Resend" button. Failed emails retry on their own. Email delivery is still waiting on sender-domain verification.

## Steps
1. **Reply to reviews**: staff can add, edit or remove one public reply per review from Admin → Reviews. The reply shows under the review on the stay page, and each change is logged.
2. **Guides editor**: help guides move into the database. Admin → Guides lets staff add, edit, publish or unpublish guides. The help pages read published guides, and today's text is loaded as the starting content.
3. **Block a user**: Admin → User detail gets "Block" and "Unblock" in the three-dot menu, with a required reason. A blocked person can still browse but can't pay, hold a stay, request a viewing or send messages. They see a short notice with the support email. Each block and unblock is logged.
4. **View-only Settings**: only admins can save Settings. Other team roles see the page read-only, and the server rejects their changes too.
5. **Partner wallet**: stays open until RayProp provides a balance lookup. Health keeps its current warning when partner bookings fail.
6. **Checks**: run browser checks for each new action, add rule tests (a blocked user can't pay, a non-admin can't save Settings, one reply per review) and run the whole test suite. Then update the roadmap.

## Technical details
- New tables: `review_replies` (unique per review, staff write via an RPC, public read) and `help_guides` (public read when published, staff write). Each has RLS and grants, checked with `private.is_staff`.
- Blocking: add `blocked_at`/`blocked_reason` to a staff-only `user_status` table, set through `staff_user_action`. `paystack-init`, `submit_bank_transfer`, the viewing request and message insert policies all refuse blocked users.
- Settings: limit `app_settings` updates to `private.has_role(admin)`, and the client hides the Save buttons from other roles.
- Record the blocking and guides rules in AGENTS.md.
