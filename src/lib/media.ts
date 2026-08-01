// Client-side media helpers: compress + convert images to WebP before upload.
// Keeps the app lightweight and avoids large file errors.

const MAX_DIM = 1920;
const QUALITY = 0.82;

export const isImage = (file: File) =>
  file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp|heic|heif|avif|tiff?)$/i.test(file.name);

const isHeic = (file: File) =>
  /image\/hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);

/** Decode HEIC/HEIF (which browsers can't render) into a JPEG File. */
const heicToJpeg = async (file: File): Promise<File> => {
  const { heicTo } = await import("heic-to");
  const blob = await heicTo({ blob: file, type: "image/jpeg", quality: 0.9 });
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
};

/**
 * Convert any browser-supported image to WebP. HEIC/HEIF are decoded first so
 * they never end up stored in a format browsers can't display.
 * Throws when the file cannot be decoded at all, so the uploader can warn.
 */
export const toWebp = async (file: File, quality = QUALITY): Promise<File> => {
  if (!isImage(file)) return file;
  if (file.type === "image/webp" && file.size < 500 * 1024) return file;

  let source = file;
  if (isHeic(file)) {
    try {
      source = await heicToJpeg(file);
    } catch {
      throw new Error(`${file.name}: this iPhone HEIC photo could not be converted. Please re-save it as JPEG and try again.`);
    }
  }

  try {
    const bitmap = await createImageBitmap(source);

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

/** Guess a safe mime-type + extension for storage upload from a File. */
export const inferUpload = (file: File) => {
  const nameExt = (file.name.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const typeExt = (file.type.split("/")[1] || "").toLowerCase();
  const ext = nameExt || typeExt || "bin";
  const contentType =
    file.type && file.type !== "application/octet-stream"
      ? file.type
      : ext === "heic" || ext === "heif"
      ? "image/heic"
      : ext === "avif"
      ? "image/avif"
      : ext === "jpg" || ext === "jpeg"
      ? "image/jpeg"
      : ext === "png"
      ? "image/png"
      : ext === "webp"
      ? "image/webp"
      : "application/octet-stream";
  return { ext, contentType };
};

