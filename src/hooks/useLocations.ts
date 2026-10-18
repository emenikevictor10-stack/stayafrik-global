import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Location } from "@/lib/locations";

/** Whole master place list (a few hundred rows), cached for the session. */
export const useLocations = () => {
  const q = useQuery({
    queryKey: ["locations"],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("id,name,slug,type,parent_id,aliases,listing_count")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data || []) as Location[];
    },
  });
  const all = q.data || [];
  const byId = useMemo(() => new Map(all.map((l) => [l.id, l])), [all]);
  return { all, byId, loading: q.isLoading, refetch: q.refetch };
};
