# Grant admin access to ezekielbassey@outlook.com

## Goal
Make ezekielbassey@outlook.com an admin so it can open /admin.

## Current state (verified)
- Admin access = /admin route guarded by `RequireAdmin`, which checks `user_roles` for role `admin`.
- Existing admins: elmezbrands@gmail.com, emenikevictor10@gmail.com.
- ezekielbassey@outlook.com has **no account yet** — no row in auth.users, so we cannot attach a role to it today.

## Steps
1. **The account signs in once.** Sign in at /auth with Google using ezekielbassey@outlook.com (any device, or the preview). This creates the account row.
2. **Grant the admin role.** Once the account exists, insert `role = 'admin'` into `user_roles` for that user via a database data change (one INSERT; no schema change needed).
3. **Verify.** Re-check `user_roles`, then confirm the account can open /admin and sees the admin console.

## What the user needs to do
Sign in once with ezekielbassey@outlook.com through the app's "Continue with Google" — the admin role can only be attached after the account exists. Everything after that is done for you.

## Notes
- No code changes, no schema changes. One INSERT into `user_roles` after the account's first sign-in.
