// Client-side media helpers: compress + convert images to WebP before upload.
// Keeps the app lightweight and avoids large file errors.

const MAX_DIM = 1920;
const QUALITY = 0.82;

export const isImage = (file: File) => file.type.startsWith("image/");

/**
 * Convert any browser-supported image (jpg, png, heic-in-jpg wrapper, webp…) to WebP.
 * Falls back to the original file if conversion isn't supported.
 */
export const toWebp = async (file: File, quality = QUALITY): Promise<File> => {
  if (!isImage(file)) return file;
  if (file.type === "image/webp" && file.size < 500 * 1024) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas =
      typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(w, h)
        : Object.assign(document.createElement("canvas"), { width: w, height: h });
    const ctx = (canvas as any).getContext("2d");
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob: Blob =
      "convertToBlob" in canvas
        ? await (canvas as OffscreenCanvas).convertToBlob({ type: "image/webp", quality })
        : await new Promise((res, rej) =>
            (canvas as HTMLCanvasElement).toBlob(
              (b) => (b ? res(b) : rej(new Error("Encode failed"))),
              "image/webp",
              quality,
            ),
          );
    const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return new File([blob], name, { type: "image/webp" });
  } catch {
    return file;
  }
};
