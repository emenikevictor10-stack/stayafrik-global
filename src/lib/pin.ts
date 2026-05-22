// Local-device PIN unlock. SHA-256 hashed, stored per user in localStorage.
// Exactly 4 digits, Airbnb-style. This is NOT an auth factor; it's a convenience
// lock on top of a valid Supabase session.

export const PIN_LENGTH = 4;

const keyFor = (uid: string) => `stay:pin:${uid}`;
const sessionKey = (uid: string) => `stay:pin-unlocked:${uid}`;

const sha256 = async (s: string) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

export const hasPin = (uid: string) => !!localStorage.getItem(keyFor(uid));
export const setPin = async (uid: string, pin: string) => {
  if (!/^\d{4}$/.test(pin)) throw new Error("PIN must be exactly 4 digits");
  localStorage.setItem(keyFor(uid), await sha256(`${uid}:${pin}`));
  sessionStorage.setItem(sessionKey(uid), "1");
};
export const clearPin = (uid: string) => {
  localStorage.removeItem(keyFor(uid));
  sessionStorage.removeItem(sessionKey(uid));
};
export const verifyPin = async (uid: string, pin: string) => {
  const stored = localStorage.getItem(keyFor(uid));
  if (!stored) return false;
  const ok = stored === (await sha256(`${uid}:${pin}`));
  if (ok) sessionStorage.setItem(sessionKey(uid), "1");
  return ok;
};
export const isUnlocked = (uid: string) => sessionStorage.getItem(sessionKey(uid)) === "1";
export const lock = (uid: string) => sessionStorage.removeItem(sessionKey(uid));
