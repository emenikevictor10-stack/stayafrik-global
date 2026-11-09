/** App settings (admin-editable). Defaults apply when a key is missing or the wrong type. */
export const FEATURE_KEYS = ["search_fields", "card_payments", "holds", "report_problem", "id_required", "map", "whatsapp", "phone_signin", "mapbox", "split_payments", "addons"] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

export const DEFAULT_FEATURES: Record<FeatureKey, boolean> = {
  search_fields: true, card_payments: true, holds: true, report_problem: true, id_required: false,
  map: true, whatsapp: false, phone_signin: false, mapbox: false, split_payments: true, addons: true,
};

export const DEFAULTS = {
  service_fee_bps: 800,
  guest_service_fee_bps: 0,
  hold_minutes: 15,
  split_hold_hours: 6,
  payment_window_minutes: 60,
  host_accept_hours: 24,
  support_email: "support@stayglobal.app",
  sg_bank_account: "",
  company: "StayGlobal",
  guarantee_text: "",
} as const;

export type SettingsMap = Record<string, unknown>;

export const num = (s: SettingsMap, key: keyof typeof DEFAULTS | string, fallback: number) => {
  const v = s[key];
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : fallback;
};
export const str = (s: SettingsMap, key: string, fallback: string) => (typeof s[key] === "string" && (s[key] as string).trim() ? (s[key] as string) : fallback);

export const features = (s: SettingsMap): Record<FeatureKey, boolean> => {
  const f = (s.features && typeof s.features === "object" ? s.features : {}) as Record<string, unknown>;
  return Object.fromEntries(FEATURE_KEYS.map((k) => [k, typeof f[k] === "boolean" ? f[k] : DEFAULT_FEATURES[k]])) as Record<FeatureKey, boolean>;
};

/** Service fee on local stays, in naira, from a subtotal. */
export const serviceFee = (subtotal: number, bps: number) => Math.round((subtotal * bps) / 10000);
