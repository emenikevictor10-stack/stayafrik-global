import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Property, PropertyType } from "@/data/properties";
import lekki from "@/assets/prop-lekki.jpg";
import vi from "@/assets/prop-vi.jpg";
import maitama from "@/assets/prop-maitama.jpg";
import ikoyi from "@/assets/prop-ikoyi.jpg";
import land from "@/assets/prop-land.jpg";
import wuse from "@/assets/prop-wuse.jpg";
import { searchRayProp, getRayPropListing } from "@/lib/rayprop";
import { raypropToProperty } from "@/lib/rayprop-map";
import { normalizeState, stateForCity } from "@/lib/nigeria-places";

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
  state_id?: string | null;
  city_id?: string | null;
  neighbourhood_id?: string | null;
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  type: string;
  price_per_night: number;
  location: string | null;
  address: string | null;
  city: string | null;
  state?: string | null;
  neighborhood?: string | null;
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
  listing_code?: string | null;
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
    state: normalizeState(r.state) || stateForCity(r.city) || undefined,
    neighborhood: r.neighborhood || undefined,
    createdAt: r.created_at,
    listingCode: r.listing_code || undefined,
    placeIds: [r.state_id, r.city_id, r.neighbourhood_id].filter(Boolean) as string[],
  };
};

const RAYPROP_PAGE = 30;

const dedupe = (rows: ReturnType<typeof raypropToProperty>[]) => {
  const seen = new Set<string>();
  return rows.filter((p): p is Property => !!p && !seen.has(p.id) && !!seen.add(p.id));
};

/** One page of the full partner catalogue (1-based page), optionally filtered by text. */
const fetchRayPropPage = async (page: number, q?: string, locationId?: string): Promise<{ items: Property[]; hasMore: boolean }> => {
  const r = await searchRayProp(RAYPROP_PAGE, { page, ...(q ? { q } : {}), ...(locationId ? { locationId } : {}) });
  return { items: dedupe(r.items.map((raw) => raypropToProperty(raw, placeholderImg))), hasMore: r.hasMore };
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
  const qRef = useRef<string | null>(null);
  const locRef = useRef<string | undefined>(undefined);

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
      // Partner stays are intentionally NOT loaded here — they cost partner API
      // calls, so they only load when the guest searches (see searchPartner).
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  /** Fetch the next page of partner search results and append it (infinite scroll).
   *  Only active while a search query is set — the homepage never pages partner stays. */
  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore || !qRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const page = await fetchRayPropPage(pageRef.current, qRef.current || undefined, locRef.current);
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

  /** Server-side partner text search; null clears partner results (back to local-only homepage). */
  const searchPartner = useCallback(async (q: string | null, locationId?: string) => {
    if (!q) {
      qRef.current = null;
      locRef.current = undefined;
      setPartner([]);
      setHasMore(false);
      return;
    }
    try {
      // Search results page through the whole catalogue too (searchQ drives loadMore).
      const page = await fetchRayPropPage(1, q, locationId);
      pageRef.current = 2;
      qRef.current = q;
      locRef.current = locationId;
      setPartner(page.items);
      setHasMore(page.hasMore);
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
