# Phase 13 (Saved lists + compare) — close-out

Phase 13 is marked done, but checking it against the plan document shows six items missing.

## What already works
- Heart saves a stay, kept on the device and synced to the account after sign-in.
- Named lists can be created, and stays added to or removed from them.
- Share link for a list (read-only page).
- Compare up to 3 stays: price, area, bedrooms, bathrooms, guests, rating, power, water, security, verified.

## Missing (to build)
1. **Rename a list.**
2. **Delete a list**, with a confirm step. The default "All saved" list can't be deleted.
3. **Join a shared list:** the shared page gets a "Join this list" button for signed-in people. Members can add and remove stays. The owner can remove members, and members can leave.
4. **PRD links:** `/w/:token` opens shared lists (the current `/saved/shared/:token` keeps working), and `/saved/:id` opens one list directly.
5. **Shareable compare link:** `/compare?ids=a,b,c` opens those stays, and a "Copy link" button sits on the compare page.
6. **Floating "Compare (N)" bar:** shows on Explore, results and Saved once 2 or more stays are picked, with Clear and Compare buttons.

## Checks
- A test for the compare link rule (max 3, ignores repeats).
- Browser check on phone and computer while signed in: create, rename, share, join from a second account if one is available, then leave, delete and compare.

## Technical
- Add a `wishlist_members` table (wishlist_id, user_id, joined_at) with RLS. Update `wishlists`/`wishlist_items` policies so members can read and edit items; for this, use a SECURITY DEFINER helper `private.is_wishlist_member` to avoid recursive policies.
- Add a `join_wishlist(token)` RPC, so a token holder can join without seeing other lists.
- Put the compare link parsing in a pure helper in `src/lib/compare.ts`, with a test. Build the `CompareBar` once in the app shell.
- Record the new rule in AGENTS.md and update the roadmap P13 line.
