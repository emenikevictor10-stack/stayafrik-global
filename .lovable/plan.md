# Split Users and Team, with team invites and roles

## What changes for you

**Users page (People → Users)**
- Shows only people who signed up normally: guests and hosts.
- The "Make admin / Revoke admin" button and the "Admins" filter come off this page.

**Team page (moves to its own "Team" group in the admin menu)**
- Lists everyone on the team, with their role(s) and when they joined.
- **Invite team member:** enter an email and pick one or more roles, then send. They get an email invite. When they sign in with Google using that email, they join the team with those roles automatically. Until then, the invite shows as "Pending", and you can resend it or cancel it.
- **Change roles:** tick or untick roles for any team member.
- **Remove from team:** takes away all team roles after you confirm. Their normal guest or host account stays.
- **Removing admins:** an admin can remove another admin. Two safety rules apply: you can't remove yourself, and the last remaining admin can't be removed, so nobody gets locked out.
- Every invite, role change and removal is saved in the audit log.

## Team roles (my suggested default; tell me if you want different ones)

| Role | Can see and do |
|---|---|
| Admin | Everything, including Team and Settings |
| Support | Guest problems, bookings, viewings, messages, date changes, add-on orders |
| Finance | Payments, payouts, refunds, insights |
| Listings | Listing approvals, reviews, location audit, ID review, hosts |

- Each team member sees only the parts of the admin menu their roles allow.
- Opening a page outside your roles shows a "No access" message.
- The server checks the role on every action too, so the screen alone can't get round it.

## Technical details

- Add `support`, `finance` and `listings` to the `app_role` enum. Roles stay in `user_roles` only.
- Add a `private.is_staff(uid)` and `private.has_any_role(uid, roles[])` SECURITY DEFINER helper.
- New table `team_invites` (email, roles[], invited_by, status pending/accepted/cancelled, created_at, accepted_at), with GRANTs and RLS limited to admins.
- New RPCs, all audited and admin-only:
  - `staff_team_invite(email, roles)`
  - `staff_team_set_roles(user_id, roles)`
  - `staff_team_remove(user_id)`, which refuses self-removal and removing the last admin
  - `staff_team_cancel_invite(id)`
- `handle_new_user` (and a check on sign-in for existing accounts) accepts a pending invite that matches the user's email.
- The invite email goes through the existing email queue (service-role only), with a link to `/auth`.
- Existing `staff_*` RPCs and admin RLS widen from admin-only to the matching role. For example, `staff_payout_action` accepts admin or finance, and `staff_issue_action` accepts admin or support.
- `RequireAdmin` becomes `RequireStaff` (any team role). Each nav item in `adminNav.ts` gets a `roles` list, and the menu and routes filter on it. The roles come from a new `useStaffRoles` hook.
- `AdminUsers` excludes anyone with a team role and drops the grant/revoke UI. The `admin-set-role` function is replaced by the RPCs above.
- Tests cover the last-admin and self-removal guards, plus the nav filtering per role.
- Update the AGENTS.md admin navigation rule and roadmap.md.
