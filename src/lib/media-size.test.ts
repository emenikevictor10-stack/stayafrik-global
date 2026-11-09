import { describe, it, expect } from "vitest";
import { sizedImage } from "./media-size";
import { partnerVideos } from "./rayprop-map";

const RP = "https://tytsncfkohapygnkilvh.supabase.co/storage/v1/object/public/listing-images/a/1.jpeg";

describe("sizedImage", () => {
  it("asks RayProp for a resized copy", () => {
    expect(sizedImage(RP, 640)).toBe("https://tytsncfkohapygnkilvh.supabase.co/storage/v1/render/image/public/listing-images/a/1.jpeg?width=640&quality=70&resize=contain");
  });
  it("leaves other photos unchanged", () => {
    expect(sizedImage("https://example.com/a.webp", 640)).toBe("https://example.com/a.webp");
  });
});

describe("partnerVideos", () => {
  it("maps RayProp videos in display order", () => {
    const v = partnerVideos({ listing_videos: [
      { display_order: 2, video_url: "b.mp4" },
      { display_order: 1, video_url: "a.mp4", thumbnail_url: "a.jpg", duration_seconds: 24 },
      { display_order: 3 },
    ] });
    expect(v).toEqual([{ url: "a.mp4", poster: "a.jpg", duration: 24, youtube: undefined }, { url: "b.mp4", poster: undefined, duration: undefined, youtube: undefined }]);
  });
  it("returns nothing when there are no videos", () => {
    expect(partnerVideos({ listing_videos: [] })).toBeUndefined();
  });
});

describe("video-only partner stays", () => {
  it("use the video preview, never a stock photo", async () => {
    const { raypropToProperty } = await import("./rayprop-map");
    const p = raypropToProperty({ unique_listing_id: "ABC", listing_images: [], listing_videos: [{ video_url: "v.mp4", thumbnail_url: "t.jpg" }] }, "stock.jpg")!;
    expect(p.image).toBe("t.jpg");
    expect(p.images).toEqual(["t.jpg"]);
    expect(p.videoOnly).toBe(true);
  });
});
