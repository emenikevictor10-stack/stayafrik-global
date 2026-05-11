## Goal
Make the app installable and pass pwabuilder.com validation cleanly, and replace decorative emojis with proper Lucide icons throughout the UI.

## Heads-up before we start
PWA + service workers are advanced. Inside the Lovable editor preview the service worker will stay disabled (it runs inside an iframe and would cache stale builds). **Install / offline behaviour will only work on the published `lovable.app` URL or a custom domain — not in the editor preview.** That is the correct trade-off and is required to keep the editor usable.

## What pwabuilder.com checks (and what we'll fix)

1. Valid `manifest.webmanifest` linked from `index.html` — already present, will tighten fields.
2. Required icons (192, 512, plus a maskable 512) — already present, will verify sizes/format.
3. A registered service worker reachable at `/sw.js` with `fetch`, `install`, `activate` handlers — to be added.
4. HTTPS + correct `start_url` / `scope` / `id` — fine on `*.lovable.app`.
5. `theme_color` matching `<meta name="theme-color">` — will align both to brand lime `#C8F03E`.
6. Screenshots for desktop + mobile form factors — already present, will keep.
7. Categories, description, lang, dir — will add `lang: "en"`, `dir: "ltr"`.

## Plan

### 1. Manifest (`public/manifest.webmanifest`)
- Add `"lang": "en"`, `"dir": "ltr"`.
- Keep `theme_color: "#C8F03E"` and update `<meta name="theme-color">` in `index.html` to match (currently `#0A0A0A`).
- Keep existing icons + screenshots (already valid).
- Add a `shortcuts` array (Explore, New Listing, Bookings) — pwabuilder rewards this.

### 2. Service worker (`public/sw.js`)
A minimal, safe SW:
- `install`: `skipWaiting()`, precache app shell (`/`, `/manifest.webmanifest`, icons).
- `activate`: `clients.claim()`, purge old caches.
- `fetch`: **NetworkFirst** for navigations (so new deploys never get stuck behind cached HTML), **CacheFirst** for hashed static assets, bypass for non-GET and cross-origin Supabase calls.
- No Workbox / no `vite-plugin-pwa` — plain JS to keep the Vite/HMR setup untouched.

### 3. Registration guard (`src/main.tsx`)
Register the SW only when **all** are true:
- `'serviceWorker' in navigator`
- `window.self === window.top` (not in an iframe → skips Lovable preview)
- hostname does **not** include `lovableproject.com` or `id-preview--`
- `import.meta.env.PROD`

In preview/iframe, actively `unregister()` any existing SW and clear caches so a stale worker can never wedge the editor.

### 4. Replace emojis with Lucide icons
Swap decorative emojis for `lucide-react` icons (already a dep), keeping copy unchanged:

| Location | Today | After |
|---|---|---|
| `TopBar` role pill, `Profile` mode-switch button | 👤 / 🧑‍💼 | `User` / `Briefcase` |
| `RoleContext` avatar fallback (`user.emoji`) | 🙋🏾‍♀️ / 🧑🏾‍💼 | initials chip (first letter of name) wrapped over a `User` icon fallback |
| `Profile.tsx` menu items (🪪💳🔐❤️🌍🛟 etc.) | emoji glyph | `IdCard`, `CreditCard`, `ShieldCheck`, `Heart`, `Globe`, `LifeBuoy`, `BadgeCheck`, `Wallet`, `Banknote`, `TrendingUp` |
| `AgentProfile` "Verified" pill | ✓ emoji | `BadgeCheck` |
| `Messages` / `ChatThread` / `EscrowDetail` / `Auth` / `EditProfile` decorative emojis | various | nearest matching Lucide icon, same colour token |

Avatar fallback approach: render initials in the existing primary-tinted circle; if no name yet, render a `<User />` icon. This removes all `user.emoji` references from `RoleContext` and its consumers.

### 5. `index.html` polish
- Sync `theme-color` meta to `#C8F03E`.
- Keep existing apple-touch-icon, manifest link, viewport-fit cover.

### 6. Verification
After changes:
- Build (auto via harness) and confirm no TS errors.
- Open the **published** URL in pwabuilder.com → expect green on Manifest, Service Worker, Security; address any warnings it surfaces.
- Confirm editor preview still hot-reloads (SW must stay unregistered there).

## Out of scope
- Offline data sync for Supabase queries (would require IndexedDB strategy — separate ask).
- Push notifications.
- iOS splash screens beyond the existing apple-touch-icon (can add later if pwabuilder flags it).
