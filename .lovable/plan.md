# Faster partner photos, plus partner videos

## What I found
- RayProp stays average about 10 photos each, and some have 50. We load RayProp's full-size original files, even inside small cards and thumbnails.
- RayProp's photo server can send a smaller WebP copy on request. In my test, a card-sized copy was 55–60% smaller (100 KB down to 43 KB, and 29 KB down to 13 KB).
- Each card loads every photo in its swipe strip from the start. Only "lazy" loading holds them back, so a card can still pull in several photos the guest never swipes to.
- **Videos:** 413 of the 1,349 partner stays have a video, and each comes with its own preview image. We ignore these videos today. None of the stays has a virtual tour link.

## What I'll change
1. **Right-sized photos for partner stays:** small WebP copies for cards (about 640px wide), medium copies on the stay page (about 1280px), and the full photo only when opened full screen. If a smaller copy fails to load, the original is used instead.
2. **Lighter cards:** each card loads its first photo plus the next one. More photos load as the guest swipes. Map popups and suggestions use tiny thumbnails.
3. **First photo arrives sooner:** the top row of results loads first, at higher priority, and the rest wait.
4. **Smaller search replies:** search results send only what a card needs (title, price, place, a few photos, whether a video exists). The full photo list and details load on the stay page.
5. **Partner videos:**
   - Stays with a video show a small play badge on the card.
   - On the stay page, the video sits in the gallery as a "Video" tile with its preview image. It only starts loading when tapped, so pages stay light.
   - YouTube links are handled too, if RayProp sends any.
   - This uses the same player as our own stays' walkthrough videos.
6. **Check:** compare page weight and first-photo time on the browse page and a partner stay page before and after, on phone and desktop.

## Technical notes
- `rayprop-map.ts` gains a resize helper (`/object/public/` becomes `/render/image/public/?width=&quality=70`, keeping the original as the fallback). It also maps `listing_videos` (`video_url`, `thumbnail_url`, `youtube_url`, `duration_seconds`, sorted by `display_order`) onto `Property.videos`.
- `rayprop-api` search trims each record to the card fields and its first 5 photos. The detail call returns the full record. Add tests for the mapper and resize helper.
- `PropertyCard`: render images from the current one up to the next only, with `fetchpriority="high"` on the first row. `StayMedia` and the gallery use `srcset` and add the video tile using `preload="none"`.
- Our own stays already use converted WebP files, so they aren't changed.
