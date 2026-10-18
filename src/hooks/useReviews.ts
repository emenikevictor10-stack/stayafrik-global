import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ReviewItem = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  guest_id: string;
  guest_name: string;
  guest_avatar: string | null;
};

export const useReviews = (listingId: string | undefined) => {
  const [data, setData] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!listingId) {
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      if (listingId.startsWith("rp_")) {
        // Partner stay: RayProp's reviews (none shown if RayProp has none).
        const { data: res } = await supabase.functions.invoke("rayprop-api", { body: { action: "reviews", listing_id: listingId } });
        const raw = res?.data;
        const arr: any[] = Array.isArray(raw) ? raw : raw?.reviews || raw?.items || [];
        if (!active) return;
        setData(arr.filter((r) => Number(r?.rating) > 0).map((r, i) => ({
          id: String(r.id || i), rating: Math.round(Number(r.rating)), comment: r.comment || r.text || r.body || null,
          created_at: r.created_at || r.date || new Date().toISOString(), guest_id: "",
          guest_name: r.guest_name || r.reviewer_name || r.author || "Verified guest", guest_avatar: null,
        })));
        setLoading(false);
        return;
      }
      const { data: rows } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, guest_id")
        .eq("listing_id", listingId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!active) return;
      const list = rows || [];
      const ids = Array.from(new Set(list.map((r) => r.guest_id)));
      let profileMap: Record<string, { name: string; avatar: string | null }> = {};
      if (ids.length) {
        const { data: profs } = await supabase.rpc("get_public_profiles", { _user_ids: ids });
        profileMap = Object.fromEntries(
          (profs || []).map((p: any) => [p.user_id, { name: p.full_name || "Guest", avatar: p.avatar_url }]),
        );
      }
      setData(
        list.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          created_at: r.created_at,
          guest_id: r.guest_id,
          guest_name: profileMap[r.guest_id]?.name || "Verified guest",
          guest_avatar: profileMap[r.guest_id]?.avatar || null,
        })),
      );
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [listingId]);

  return { data, loading };
};
