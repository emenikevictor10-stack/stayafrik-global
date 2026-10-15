// Pure helpers shared by RayProp edge functions (no Deno APIs, so tests can import them).

/** RayProp returns every amount in kobo. */
export const koboToNaira = (kobo: unknown) => {
  const n = Number(kobo);
  return Number.isFinite(n) ? Math.round(n) / 100 : 0;
};

const hex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");

export const signRayPropPayload = async (timestamp: string, rawBody: string, secret: string) => {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${rawBody}`)));
};

const safeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

/** Verifies `X-RayProp-Signature: sha256=<hex>` over `{_meta.timestamp}.{rawBody}`. */
export const verifyRayPropSignature = async (rawBody: string, header: string | null, secret: string) => {
  const provided = (header || "").replace(/^sha256=/i, "").trim().toLowerCase();
  if (!provided) return false;
  let timestamp = "";
  try { timestamp = String(JSON.parse(rawBody)?._meta?.timestamp || ""); } catch { return false; }
  if (!timestamp) return false;
  return safeEqual(provided, await signRayPropPayload(timestamp, rawBody, secret));
};

/** Maps a RayProp webhook event / reservation status to a StayGlobal booking status. */
export const mapRayPropStatus = (eventOrStatus: string): string | null => {
  const s = eventOrStatus.toLowerCase();
  if (s.includes("cancel")) return "cancelled";
  if (s.includes("complete")) return "completed";
  if (s.includes("checked_in")) return "confirmed";
  if (s.includes("booked") || s.includes("payment_confirmed") || s === "paid") return "confirmed";
  if (s.includes("fail")) return "failed";
  return null;
};
