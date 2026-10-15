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

const str = (v: unknown) => (v == null ? "" : String(v));
const num = (v: unknown, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const list = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => (typeof x === "object" && x ? str((x as any).name ?? (x as any).label) : str(x))).filter(Boolean) : [];

const fmt = (n: number) => "₦" + Math.round(n).toLocaleString();

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
    amenities: [...list(raw.amenities), ...list(raw.building_amenities)].map((label) => ({ emoji: "✓", label })),
    lat: num(raw.lat ?? raw.latitude, 6.5244),
    lng: num(raw.lng ?? raw.longitude, 3.3792),
    source: "rayprop",
    raypropListingId: rawId,
    city,
    maxGuests: num(raw.max_guests) || undefined,
    checkInTime: str(raw.check_in_time) || undefined,
    checkOutTime: str(raw.check_out_time) || undefined,
    houseRules: list(raw.house_rules),
    createdAt: str(raw.created_at) || undefined,
  };
};
