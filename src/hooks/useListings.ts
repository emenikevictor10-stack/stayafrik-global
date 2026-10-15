import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Property, PropertyType } from "@/data/properties";
import lekki from "@/assets/prop-lekki.jpg";
import vi from "@/assets/prop-vi.jpg";
import maitama from "@/assets/prop-maitama.jpg";
import ikoyi from "@/assets/prop-ikoyi.jpg";
import land from "@/assets/prop-land.jpg";
import wuse from "@/assets/prop-wuse.jpg";
import { searchRayProp, getRayPropListing, RAYPROP_CITIES } from "@/lib/rayprop";
import { raypropToProperty } from "@/lib/rayprop-map";

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
    source: "stayglobal",
    city: r.city || undefined,
    createdAt: r.created_at,
  };
};

const RAYPROP_PAGE = 30;

const dedupe = (rows: ReturnType<typeof raypropToProperty>[]) => {
  const seen = new Set<string>();
  return rows.filter((p): p is Property => !!p && !seen.has(p.id) && !!seen.add(p.id));
};

/** One page of partner stays across all cities (1-based page). hasMore = any city has another page. */
const fetchRayPropPage = async (page: number, q?: string): Promise<{ items: Property[]; hasMore: boolean }> => {
  const results = await Promise.allSettled(
    RAYPROP_CITIES.map((city) => searchRayProp(city, RAYPROP_PAGE, { page, ...(q ? { q } : {}) })),
  );
  const rows: Record<string, unknown>[] = [];
  let hasMore = false;
  for (const r of results) {
    if (r.status === "fulfilled") {
      if (r.value.hasMore) hasMore = true;
      rows.push(...r.value.items);
    }
  }
  return { items: dedupe(rows.map((raw) => raypropToProperty(raw, placeholderImg))), hasMore };
};

const fetchRayProp = async (): Promise<Property[]> => (await fetchRayPropPage(1)).items;

/** Mix partner and local listings, newest first (items without a date keep their relative spot). */
const mixListings = (local: Property[], partner: Property[]) => {
  const out: Property[] = [];
  const max = Math.max(local.length, partner.length);
  for (let i = 0; i < max; i++) {
    if (local[i]) out.push(local[i]);
    if (partner[i]) out.push(partner[i]);
  }
  return out;
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
  const [local, setLocal] = useState<Property[]>([]);
  const [partner, setPartner] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const pageRef = useRef(1);
  const loadingMoreRef = useRef(false);

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
        setLocal(rows.map((r) => rowToProperty(r, hosts.get(r.host_id))));
      } else if (error) {
        console.error("[stayglobal] listings unavailable", error);
      }
      try {
        const page = await fetchRayPropPage(1);
        if (!active) return;
        pageRef.current = 2;
        setPartner(page.items);
        setHasMore(page.hasMore);
      } catch (raypropError) {
        console.error("[rayprop] listings unavailable", raypropError);
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  /** Fetch the next page of partner stays and append it (infinite scroll). */
  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const page = await fetchRayPropPage(pageRef.current);
      pageRef.current += 1;
      setPartner((prev) => dedupe([...prev, ...page.items]));
      setHasMore(page.hasMore);
    } catch (error) {
      console.error("[rayprop] load more failed", error);
      setHasMore(false);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [hasMore]);

  /** Server-side partner text search; null restores the paged feed. */
  const searchPartner = useCallback(async (q: string | null) => {
    if (!q) {
      try {
        const page = await fetchRayPropPage(1);
        pageRef.current = 2;
        setPartner(page.items);
        setHasMore(page.hasMore);
      } catch (error) {
        console.error("[rayprop] listings unavailable", error);
      }
      return;
    }
    try {
      const page = await fetchRayPropPage(0, q);
      setPartner(page.items);
      setHasMore(false);
    } catch (error) {
      console.error("[rayprop] search unavailable", error);
    }
  }, []);

  const data = useMemo(() => mixListings(local, partner), [local, partner]);

  return { data, loading, loadingMore, hasMore, loadMore, searchPartner };
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
          const records = await getRayPropListing(id.slice(3));
          const property = records.map((r) => raypropToProperty(r, placeholderImg)).find((item) => item?.id === id) || null;
          if (active) setData(property);
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
