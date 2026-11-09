# Show video-only partner stays properly

## What I found
- 160 of the 1,349 RayProp stays have no photos, only a video.
- They aren't hidden. Instead, they show a stock photo of a different apartment (our sample "Maitama" image) on the card and stay page. That misleads guests, and their real video is only reachable through the small "Video" button.

## What I'll change
1. **Card:** use the video's own preview image as the card picture, with the "Video" tag. The stock photo is never used for a partner stay.
2. **Stay page:** when a stay has no photos, the top of the page shows the video tile (preview image plus play button) instead of the photo gallery. It plays right there, and the "All photos" link is hidden.
3. **Photos page:** the header says "1 video" instead of "1 photos", and the video is shown first.
4. **Compare, saved, trips and admin:** these thumbnails also use the video preview image.
5. **Rare case:** if a stay has neither photos nor a video preview image, show a plain "No photos yet" tile instead of a fake photo.
6. **Check:** open a video-only stay on desktop and phone, confirm the card, stay page and play button, and add tests.

## Technical notes
- In `raypropToProperty`, set `images` from listing photos, else the video `thumbnail_url`s, else an empty list, and add a `videoOnly` flag. Drop `fallbackImage` for partner stays.
- `PropertyDetail` renders `StayVideos` in the header when `videoOnly`. `PropertyCard` and `StayImage` render the empty tile when there is no image.
- Tests: a video-only record maps to the poster as its image, and is never given the placeholder.
