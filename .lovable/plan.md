# Dedicated admin sign-in screen

## What I checked
- Visiting /admin while signed out redirects to the normal guest sign-in page. That page asks "I'm booking / I'm an agent" before "Continue with Google", which is confusing for team members.
- Access is still protected: only accounts with a team role get in. Everyone else is sent back to the stays list.
- Three emails can open /admin today, all with the Admin role:
  - elmezbrands@gmail.com
  - emenikevictor10@gmail.com
  - ezekiel@rayprop.io
- There are no pending team invites.

## What changes
- Visiting any /admin page while signed out shows a clean "Stay team sign-in" screen instead of the guest page:
  - Stay logo
  - "Team sign-in" title
  - One "Continue with Google" button
  - No booking or agent choice
- After sign-in, you return to the admin page you asked for.
- If the signed-in account isn't on the team, the screen says so instead of silently sending you away:
  - "This account doesn't have team access. Ask an admin to invite <email>."
  - A "Sign in with a different account" button
  - A "Go to Stay" link
- A pending team invite for that email is picked up automatically at sign-in, as it is now.

## Technical details
- New `AdminSignIn` component, rendered by `RequireAdmin` when there is no user, and a "no access" variant when the user has no team roles. This replaces the `<Navigate to="/auth">` and `<Navigate to="/">` redirects.
- Google OAuth uses `redirect_uri` set to `window.location.origin`. The intended admin path is stored in sessionStorage and navigated to after the session hydrates. This matches the existing sign-in return pattern.
- No database changes.
