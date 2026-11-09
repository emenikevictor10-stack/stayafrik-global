import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { hasCoords, type AreaPoint } from "@/lib/map-pins";

type Stay = { id: string; lat?: number | null; lng?: number | null; source?: string; raypropListingId?: string };
const UUID = /^[0-9a-f-]{36}$/i;

/** Neighbourhood/city points for stays that have no real pin of their own (stay id → point). */
export const useAreaPoints = (stays: Stay[]) => {
  const need = stays.filter((s) => !hasCoords(s));
  const local = need.filter((s) => s.source !== "rayprop" && UUID.test(s.id)).map((s) => s.id).sort();
  const partner = need.filter((s) => s.source === "rayprop").map((s) => s.raypropListingId || s.id.replace(/^rp_/, "")).sort();
  const { data } = useQuery({
    queryKey: ["area_points", local.join(","), partner.join(",")],
    enabled: local.length + partner.length > 0,
    staleTime: 30 * 60_000,
    queryFn: async () => {
      const out: Record<string, AreaPoint> = {};
      // Chunk to keep requests small.
      for (let i = 0; i < Math.max(local.length, partner.length); i += 300) {
        const { data: rows } = await supabase.rpc("stay_area_points", { _local_ids: local.slice(i, i + 300), _partner_ids: partner.slice(i, i + 300) });
        (rows || []).forEach((r) => { out[r.stay_id] = { lat: r.lat, lng: r.lng, level: r.level }; });
      }
      return out;
    },
  });
  return data || {};
};
