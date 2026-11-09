/** RayProp photo host: its storage can send resized WebP copies on request. */
const RAYPROP_HOST = "tytsncfkohapygnkilvh.supabase.co";
const OBJECT = "/storage/v1/object/public/";

/** Right-sized copy of a partner photo (WebP, quality 70). Other URLs are returned unchanged. */
export const sizedImage = (url: string, width: number): string => {
  if (!url || !width) return url;
  try {
    const u = new URL(url);
    if (u.host !== RAYPROP_HOST || !u.pathname.startsWith(OBJECT)) return url;
    u.pathname = u.pathname.replace(OBJECT, "/storage/v1/render/image/public/");
    u.search = `?width=${Math.round(width)}&quality=70&resize=contain`;
    return u.toString();
  } catch { return url; }
};

/** srcset with 1x/2x widths, or undefined when the photo can't be resized. */
export const sizedSrcSet = (url: string, width: number): string | undefined => {
  const a = sizedImage(url, width);
  if (a === url) return undefined;
  return `${a} 1x, ${sizedImage(url, width * 2)} 2x`;
};
