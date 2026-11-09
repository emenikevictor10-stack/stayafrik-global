# Refine StayGlobal logo and app icon

## Goal
Keep the current lime slash shape and change the name to read "StayGlobal" instead of "Stay".

## Steps
1. **Logo:** refine the existing logo artwork so it shows the lime slash shape followed by "StayGlobal" in clean, bold, rounded lettering. Make two versions:
   - white lettering, for dark backgrounds
   - dark lettering, for light backgrounds
   Both have transparent backgrounds.
2. **Icon:** make a square app icon with only the slash shape, centred on the brand's dark background, so it reads clearly at small sizes. Create a light version too.
3. **Check:** look at each result on light and dark backgrounds and at small sizes. Fix any clipped or hard-to-read lettering.
4. **Swap in:** replace the current logo and icon files wherever the app uses them (top bar, dock, sign-in, emails), keeping their shapes in proportion. Regenerate the browser tab icon and home-screen icons (192, 512, maskable, shortcut) from the new icon.
5. **Verify:** open the home page on desktop and phone to confirm the logo appears sharp and correctly sized.

## Technical details
- Start from `src/assets/stay-logo-2.png` and `stay-icon.png` using the image editor, saving each version to a new file in `src/assets`.
- Overwrite `public/favicon.png`, `icon-192.png`, `icon-512.png`, `icon-maskable.png` and `shortcut-96.png` with ImageMagick resizes, padding rather than stretching.
- Remove the old `stayafrik-logo.png` if nothing uses it.
