import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Property, PropertyType } from "@/data/properties";
import lekki from "@/assets/prop-lekki.jpg";
import vi from "@/assets/prop-vi.jpg";
import maitama from "@/assets/prop-maitama.jpg";
import ikoyi from "@/assets/prop-ikoyi.jpg";
import land from "@/assets/prop-land.jpg";
import wuse from "@/assets/prop-wuse.jpg";

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

export const rowToProperty = (r: ListingRow): Property => {
  const firstImg = r.images?.[0];
  const image = firstImg
    ? seedImageMap[firstImg] || firstImg
    : placeholderImg;
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
    agent: "Verified host",
    agentTag: "Verified",
    agentEmoji: "🧑🏾‍💼",
    emoji: typeEmoji(r.type),
    image,
    rating: Number(r.rating),
    reviews: r.reviews_count,
    desc: r.description || "",
    amenities: (r.amenities || []).map((a) => ({ emoji: "✓", label: a })),
    lat: r.lat ?? 9.082,
    lng: r.lng ?? 8.6753,
  };
};

export const useListings = () => {
  const [data, setData] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .order("created_at", { ascending: false });
      if (!active) return;
      if (!error && data) setData((data as ListingRow[]).map(rowToProperty));
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
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!active) return;
      if (!error && data) setData(rowToProperty(data as ListingRow));
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
      if (!error && data) setData((data as ListingRow[]).map(rowToProperty));
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [hostId]);

  return { data, loading };
};
