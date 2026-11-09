import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GUIDES, type Guide } from "@/data/guides";

/** Published help guides from the database; falls back to the built-in starter text if loading fails. */
export const useGuides = () =>
  useQuery({
    queryKey: ["help_guides", "published"],
    queryFn: async (): Promise<Guide[]> => {
      const { data, error } = await supabase.from("help_guides").select("slug,title,summary,body")
        .eq("published", true).order("sort").order("created_at");
      if (error) return GUIDES;
      return (data || []).map((g) => ({ slug: g.slug, title: g.title, summary: g.summary, body: g.body || [] }));
    },
    staleTime: 5 * 60_000,
  });
