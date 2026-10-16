import type { Property } from "@/data/properties";

/** RayProp sends every amount in kobo. */
export const koboToNaira = (kobo: unknown) => {
  const n = Number(kobo);
  return Number.isFinite(n) ? Math.round(n) / 100 : 0;
};

/** Partner price = (rate + markup) × nights, plus 7.5% VAT. All values in kobo. */
export const partnerTotalKobo = (ratePerNight: number, markupPerNight: number, nights: number) => {
  const subtotal = (ratePerNight + markupPerNight) * nights;
  return subtotal + Math.round(subtotal * 0.075);
};

const str = (v: unknown) => (v == null ? "" : String(v).replace(/[\u200B-\u200D\u2060\uFEFF]/g, "").trim());
const hhmm = (v: unknown) => str(v).slice(0, 5);
const num = (v: unknown, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const list = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => (typeof x === "object" && x ? str((x as any).name ?? (x as any).label) : str(x))).filter(Boolean) : [];

const fmt = (n: number) => "₦" + Math.round(n).toLocaleString();

const bool = (v: unknown) => v === true || v === "true" || v === 1 || v === "1";

const AMENITY_ALIASES: Record<string, string> = {
  wifi: "Wi-Fi",
  ac: "A/C",
  a_c: "A/C",
  tv: "TV",
  "smart tv": "Smart TV",
  "smart tvs": "Smart TVs",
  ps5: "PS5",
  dstv: "DStv",
  bbq_grill: "BBQ grill",
  en_suite_bedrooms: "En-suite bedrooms",
};

/** "backup_generator" -> "Backup generator", with friendly aliases for special cases. */
export const prettyAmenity = (raw: unknown) => {
  const key = str(raw).toLowerCase();
  if (AMENITY_ALIASES[key]) return AMENITY_ALIASES[key];
  return key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
};

/** Collapses variants like "streaming" vs "streaming services" and "smart tv" vs "smart tvs". */
const amenityKey = (label: string) =>
  label.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/services?$/, "").replace(/s$/, "");

/** Partner amenities, prettified and deduped, plus ones derived from structured boolean fields. */
const partnerAmenities = (raw: Record<string, any>) => {
  const seen = new Set<string>();
  const out: { emoji: string; label: string }[] = [];
  const push = (label: string) => {
    const norm = amenityKey(label);
    if (!norm || seen.has(norm)) return;
    seen.add(norm);
    out.push({ emoji: "✓", label });
  };
  for (const a of [...list(raw.amenities), ...list(raw.building_amenities)]) push(prettyAmenity(a));
  if (bool(raw.has_parking)) push(num(raw.parking_spaces) > 1 ? `${num(raw.parking_spaces)} parking spaces` : "Parking");
  if (bool(raw.has_elevator)) push("Elevator");
  if (bool(raw.allows_children)) push("Family friendly");
  if (bool(raw.allows_pets)) push("Pets allowed");
  if (bool(raw.suitable_for_events)) push("Events allowed");
  return out;
};

export const raypropToProperty = (raw: Record<string, any>, fallbackImage: string): Property | null => {
  const rawId = str(raw.id || raw.unique_listing_id || raw.listing_id);
  if (!rawId) return null;
  const imgs = Array.isArray(raw.listing_images) ? [...raw.listing_images] : [];
  imgs.sort((a: any, b: any) => Number(!!b?.is_primary) - Number(!!a?.is_primary));
  const images = imgs.map((i: any) => str(i?.image_url)).filter(Boolean);
  const priceNum = koboToNaira(raw.price_per_night);
  const city = str(raw.city);
  const hood = str(raw.neighborhood);
  const sqm = num(raw.property_size_sqm);
  return {
    id: `rp_${rawId}`,
    listingCode: partnerListingCode(rawId),
    title: str(raw.title) || "Verified partner stay",
    location: [hood, city].filter(Boolean).join(", ") || "Nigeria",
    type: "Shortlet",
    price: priceNum ? fmt(priceNum) : "Price on request",
    priceNum,
    beds: num(raw.bedrooms),
    baths: num(raw.bathrooms),
    area: sqm ? `${sqm} sqm` : "",
    verified: true,
    agent: "RayProp Partner",
    agentTag: "Verified Partner",
    agentEmoji: "✓",
    emoji: "🏖️",
    image: images[0] || fallbackImage,
    images: images.length ? images : [fallbackImage],
    rating: num(raw.rating),
    reviews: num(raw.reviews_count),
    desc: str(raw.description),
    amenities: partnerAmenities(raw),
    lat: num(raw.lat ?? raw.latitude, 6.5244),
    lng: num(raw.lng ?? raw.longitude, 3.3792),
    source: "rayprop",
    raypropListingId: rawId,
    city,
    maxGuests: num(raw.max_guests) || undefined,
    checkInTime: hhmm(raw.check_in_time) || undefined,
    checkOutTime: hhmm(raw.check_out_time) || undefined,
    houseRules: list(raw.house_rules),
    createdAt: str(raw.created_at) || undefined,
  };
};
