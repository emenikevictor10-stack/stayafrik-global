# Phase 2 — Design system (PRD §9)

The app today is dark with a neon lime accent, Plus Jakarta Sans font and 24px soft corners. Phase 2 switches the whole app to the PRD look: light by default, calm brand blue, Figtree, fewer sizes and corners. Navigation layout (bottom nav, PC dock) stays as-is — that is Phase 3.

## What you will see
- White/light app with brand blue (#275f84) buttons and links, orange for "needs action", red for errors.
- Figtree font everywhere, only regular and semibold weights.
- Tighter, consistent corners (buttons 8–10px, cards 12px, sheets 16px).
- Statuses everywhere shown as a coloured dot plus words, not coloured blocks.
- Filters shown as underlined tabs.
- Dark mode only when the guest picks it in Account (does not follow phone setting).
- The Stay wordmark image as the logo everywhere (no typed logo).
- Every list has a loading skeleton, an empty state with a next step, and an error state with "Try again".
- Buttons and taps at least 44px; 46px tall buttons on phone.

## Steps (one at a time, each checked in the browser)
1. **Tokens**: rewrite colour variables to the PRD set (bg, fg, muted, line, surface, blue, blue-hover, orange, danger, warn-bg/fg, off, scrim, chart-1/2, chart-wash) with a light set and a dark set; map existing shadcn names (primary, card, border…) onto them so every existing screen changes at once. Remove lime glow shadows.
2. **Type and corners**: load Figtree 400/600; restrict Tailwind text sizes to 12/13/15/16/20/24 (+30 hero) and radius to 4–20 scale; remap current classes (`text-sm`→13, `text-base`→15, `rounded-2xl`→16 etc.) so ~1,000 existing usages land on-scale without hand edits; replace bold/medium (~400 usages) with semibold/regular.
3. **Kit** (`src/ui/kit.tsx`): Button (primary/secondary/text/danger, loading), Header 52px, Sheet (bottom sheet phone / dialog PC), Notice, EmptyState, ErrorState, Skeleton, Tag (dot + words: warn/danger/ok/muted), Tabs (underlined), Logo (wordmark image). Reuse existing StatusDot/UnderlineTabs from Phase 1 by moving them here.
4. **Theme switch**: Light/Dark choice in Account, saved per device; default light, ignore phone dark mode.
5. **Sweep screens**: replace coloured badge blocks with Tag, typed logos with Logo, the 33 hardcoded colour classes and 2 hex values with tokens, section headings to 15px semibold sentence case, small-caps labels removed. Order: Explore + search → Stay page → checkout/trips → Account/host → admin.
6. **List states**: add skeleton / empty / error-with-retry on any list missing them.
7. **Guard script**: `check:ui` script that fails when a file uses an off-scale text size, radius, font weight or raw hex; run it and fix leftovers.
8. **Verify**: screenshots at 360px phone, tablet and 1280px PC for Explore, Stay page, Trips, Account, Admin listings — light and dark; no sideways scroll at 360px.

## Not in this phase
- Bottom nav / draggable PC dock / sidebar (Phase 3), admin shell (Phase 4).
- Splash screens and uploaded brand graphics stay unchanged.

## Technical notes
- Tokens in `src/index.css` as HSL vars; Tailwind config gains `blue`, `orange`, `danger`, `warn`, `line`, `surface`, `chart` colours and overrides `fontSize`/`borderRadius`/`fontWeight` scales.
- Dark set lives under `.dark` class toggled by a small theme provider (localStorage), not `prefers-color-scheme`.
- Search-bar and hint tokens from the search rebuild are re-pointed to new palette.
- `check:ui` is a Node script in `scripts/` added to package.json; record rule in AGENTS.md.
