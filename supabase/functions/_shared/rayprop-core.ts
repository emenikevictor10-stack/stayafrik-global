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

const norm = (v: unknown) => String(v ?? "").toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim();
const FILLER = new Set(["nigeria", "state", "lga", "the", "in", "near", "city", "area", "of", "and"]);
const ALIAS: Record<string, string> = { fct: "abuja", "federal capital territory": "abuja", vi: "victoria island", ph: "port harcourt", phc: "port harcourt" };

/** Searchable text for a RayProp listing; FCT state counts as Abuja. */
export const raypropHaystack = (r: Record<string, unknown>) => {
  const state = norm(r.state);
  const parts = [r.city, r.state, r.neighborhood, r.title, r.address, r.area].map(norm);
  if (state === "fct" || state.includes("federal capital")) parts.push("abuja");
  if (state === "rivers") parts.push("port harcourt");
  return ` ${parts.join(" ")} `;
};

/** True when every meaningful word of q appears in the listing's location/title text. */
export const raypropMatches = (r: Record<string, unknown>, q: string) => {
  let text = norm(q).replace(/,/g, " ");
  for (const [k, v] of Object.entries(ALIAS)) text = text.replace(new RegExp(`\\b${k}\\b`, "g"), v);
  const words = text.split(" ").filter((w) => w && !FILLER.has(w));
  if (!words.length) return true;
  const hay = raypropHaystack(r);
  return words.every((w) => hay.includes(w));
};

/** RayProp error codes that mean "stop calling for a while". */
export const isPauseError = (status: number, code: string) =>
  code === "API_KEY_BLOCKED" || code === "RATE_LIMITED" || status === 429 || (status === 403 && /BLOCK/i.test(code));

export const PAUSE_MINUTES = 30;
export const CATALOGUE_REFRESH_HOURS = 6;

/** True while a pause is in force. */
export const isPaused = (blockedUntil: string | null | undefined, now = Date.now()) =>
  !!blockedUntil && new Date(blockedUntil).getTime() > now;

/** A full catalogue refresh is due when never done or older than the refresh window, and not paused. */
export const catalogueRefreshDue = (lastRefresh: string | null | undefined, blockedUntil: string | null | undefined, now = Date.now()) =>
  !isPaused(blockedUntil, now) && (!lastRefresh || now - new Date(lastRefresh).getTime() >= CATALOGUE_REFRESH_HOURS * 3600_000);

/** Reconcile: which status (if any) to move a stuck partner booking to, from RayProp's reservation status. */
export const reconcileTarget = (current: string, raypropStatus: string): string | null => {
  if (!["processing", "needs_attention"].includes(current)) return null;
  const mapped = mapRayPropStatus(raypropStatus || "");
  if (!mapped || mapped === current) return null;
  if (mapped === "failed") return current === "needs_attention" ? null : "needs_attention";
  return mapped;
};

/** Wallet low? Reads kobo from the common balance field names; null when unknown. */
export const walletLow = (payload: any, thresholdKobo: number): boolean | null => {
  const d = payload?.data ?? payload;
  const v = Number(d?.balance_kobo ?? d?.available_balance_kobo ?? d?.balance ?? d?.available_balance);
  return Number.isFinite(v) ? v < thresholdKobo : null;
};
