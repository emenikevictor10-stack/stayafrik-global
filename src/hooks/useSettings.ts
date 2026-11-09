import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULTS, features, num, str, type SettingsMap } from "@/lib/settings";

export const SETTINGS_QUERY_KEY = ["app-settings"];

/** Settings readable by this user (public ones for guests, all for admins). Cached for 5 minutes. */
export const useSettings = () => {
  const q = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<SettingsMap> => {
      const { data, error } = await supabase.from("app_settings").select("key,value");
      if (error) return {};
      return Object.fromEntries((data || []).map((r) => [r.key, r.value]));
    },
  });
  const s = q.data || {};
  return {
    raw: s,
    loading: q.isLoading,
    features: features(s),
    serviceFeeBps: num(s, "service_fee_bps", DEFAULTS.service_fee_bps),
    supportEmail: str(s, "support_email", DEFAULTS.support_email),
    company: str(s, "company", DEFAULTS.company),
  };
};
