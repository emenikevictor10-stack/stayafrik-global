import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Property, PropertyType } from "@/data/properties";
import lekki from "@/assets/prop-lekki.jpg";
import vi from "@/assets/prop-vi.jpg";
import maitama from "@/assets/prop-maitama.jpg";
import ikoyi from "@/assets/prop-ikoyi.jpg";
import land from "@/assets/prop-land.jpg";
import wuse from "@/assets/prop-wuse.jpg";
import { searchRayProp, getRayPropListing, rememberRayPropListing } from "@/lib/rayprop";

// Fallback image mapping for seeded listings whose images point to bundler paths
const seedImageMap: Record<string, string> = {
  "/src/assets/prop-maitama.jpg": maitama,
  "/src/assets/prop-ikoyi.jpg": ikoyi,
  "/src/assets/prop-lekki.jpg": lekki,
  "/src/assets/prop-vi.jpg": vi,
  "/src/assets/prop-land.jpg": land,
  "/src/assets/prop-wuse.jpg": wuse,
};

const placeholderImg = maitama;

const typeEmoji = (t: string) =>
  t === "Shortlet" ? "🏖️" : t === "For Sale" ? "🏡" : t === "Land" ? "🌱" : "🏢";

const formatPrice = (n: number) => "₦" + Number(n || 0).toLocaleString();

export type ListingRow = {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  type: string;
  price_per_night: number;
  location: string | null;
  address: string | null;
  city: string | null;
  images: string[];
  bedrooms: number;
  bathrooms: number;
  area: string | null;
  amenities: string[];
  lat: number | null;
  lng: number | null;
  is_available: boolean;
  verified: boolean;
  rating: number;
  reviews_count: number;
  created_at: string;
};

type HostInfo = { full_name?: string | null; avatar_url?: string | null; whatsapp?: string | null };

export const rowToProperty = (r: ListingRow, host?: HostInfo): Property => {
  const mappedAll = (r.images || []).map((i) => seedImageMap[i] || i);
  const images = mappedAll.length ? mappedAll : [placeholderImg];
  const image = images[0];
  return {
    id: r.id,
    title: r.title,
    location: r.location || r.city || "",
    type: (r.type as PropertyType) || "Shortlet",
    price: formatPrice(r.price_per_night),
    priceNum: Number(r.price_per_night),
    beds: r.bedrooms,
    baths: r.bathrooms,
    area: r.area || "",
    verified: r.verified,
    agent: host?.full_name?.trim() || "Verified host",
    agentTag: "Verified host",
    agentEmoji: "🧑🏾‍💼",
    emoji: typeEmoji(r.type),
    image,
    images,
    rating: Number(r.rating),
    reviews: r.reviews_count,
    desc: r.description || "",
    amenities: (r.amenities || []).map((a) => ({ emoji: "✓", label: a })),
    lat: r.lat ?? 9.082,
    lng: r.lng ?? 8.6753,
    hostId: r.host_id,
    hostAvatar: host?.avatar_url ?? null,
    hostWhatsapp: host?.whatsapp ?? null,
  };
};

const raypropValue = (value: unknown, fallback = "") => String(value ?? fallback);
const raypropNumber = (value: unknown, fallback = 0) => Number(value ?? fallback) || fallback;

const raypropToProperty = (raw: Record<string, unknown>): Property | null => {
  const id = raypropValue(raw.id || raw.listing_id || raw.listingId);
  if (!id) return null;
  const rawImages = raw.images || raw.photos || raw.media;
  const images = (Array.isArray(rawImages) ? rawImages : [raw.image || raw.photo]).map((image) => {
    if (typeof image === "string") return image;
    if (image && typeof image === "object") return raypropValue((image as Record<string, unknown>).url);
    return "";
  }).filter(Boolean);
  const city = raypropValue(raw.city || raw.location || raw.area, "Nigeria");
  const priceNum = raypropNumber(raw.price_per_night || raw.nightly_rate || raw.price || raw.amount);
  const property: Property = {
    id,
    title: raypropValue(raw.title || raw.name, "Verified partner stay"),
    location: city,
    type: "Shortlet",
    price: priceNum ? formatPrice(priceNum) : "Price on request",
    priceNum,
    beds: raypropNumber(raw.bedrooms || raw.beds),
    baths: raypropNumber(raw.bathrooms || raw.baths),
    area: raypropValue(raw.area || raw.size),
    verified: true,
    agent: "Verified Partner",
    agentTag: "Verified Partner",
    agentEmoji: "✓",
    emoji: "🏠",
    image: images[0] || placeholderImg,
    images: images.length ? images : [placeholderImg],
    rating: raypropNumber(raw.rating, 0),
    reviews: raypropNumber(raw.reviews_count || raw.reviews),
    desc: raypropValue(raw.description || raw.desc),
    amenities: (Array.isArray(raw.amenities) ? raw.amenities : []).map((amenity) => ({ emoji: "✓", label: raypropValue(typeof amenity === "object" && amenity ? (amenity as Record<string, unknown>).name : amenity) })).filter((a) => a.label),
    lat: raypropNumber(raw.lat || raw.latitude, 9.082),
    lng: raypropNumber(raw.lng || raw.longitude, 8.6753),
    source: "rayprop",
    raypropListingId: id,
  };
  rememberRayPropListing(property);
  return property;
};

const fetchRayProp = async (): Promise<Property[]> => {
  const cities = ["Lagos", "Abuja", "Port Harcourt", "Enugu", "Ibadan"];
  const results = await Promise.allSettled(cities.map((city) => searchRayProp(city, 10)));
  const rows = results.flatMap((result) => result.status === "fulfilled" && Array.isArray(result.value) ? result.value : []);
  return rows.map(raypropToProperty).filter((property): property is Property => Boolean(property));
};

const fetchHosts = async (ids: string[]): Promise<Map<string, HostInfo>> => {
  const map = new Map<string, HostInfo>();
  if (!ids.length) return map;
  const unique = Array.from(new Set(ids));
  const { data } = await supabase.rpc("get_public_profiles", { _user_ids: unique });
  for (const p of ((data as any[]) || [])) {
    map.set(p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url, whatsapp: p.whatsapp });
  }
  return map;
};


export const useListings = () => {
  const [data, setData] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      // Only show admin-approved listings to guests
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("verified", true)
        .order("created_at", { ascending: false });
      if (!active) return;
      if (!error && data) {
        const rows = data as ListingRow[];
        const hosts = await fetchHosts(rows.map((r) => r.host_id));
        if (!active) return;
        const local = rows.map((r) => rowToProperty(r, hosts.get(r.host_id)));
        try {
          const partner = await fetchRayProp();
          if (active) setData([...partner, ...local]);
        } catch (raypropError) {
          console.error("[rayprop] listings unavailable", raypropError);
          if (active) setData(local);
        }
      }
      if (error) {
        console.error("[stayglobal] listings unavailable", error);
        try { setData(await fetchRayProp()); } catch (raypropError) { console.error("[rayprop] listings unavailable", raypropError); }
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  return { data, loading };
};

export const useListing = (id: string | undefined) => {
  const [data, setData] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      if (id.startsWith("rp_")) {
        try {
          const cached = (() => { try { return JSON.parse(sessionStorage.getItem("stay:rayprop:last-listing") || "null") as Property | null; } catch { return null; } })();
          if (cached?.id === id) { setData(cached); setLoading(false); return; }
          const records = await getRayPropListing(id);
          const property = records.map(raypropToProperty).find((item) => item?.id === id) || null;
          setData(property);
        } catch (error) { console.error("[rayprop] listing unavailable", error); }
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!active) return;
      if (!error && data) {
        const row = data as ListingRow;
        const hosts = await fetchHosts([row.host_id]);
        if (!active) return;
        setData(rowToProperty(row, hosts.get(row.host_id)));
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id]);

  return { data, loading };
};

export const useMyListings = (hostId: string | undefined) => {
  const [data, setData] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hostId) {
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("host_id", hostId)
        .order("created_at", { ascending: false });
      if (!active) return;
      if (!error && data) {
        const rows = data as ListingRow[];
        const hosts = await fetchHosts(rows.map((r) => r.host_id));
        if (!active) return;
        setData(rows.map((r) => rowToProperty(r, hosts.get(r.host_id))));
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [hostId]);

  return { data, loading };
};
