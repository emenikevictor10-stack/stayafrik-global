import { createClient } from "npm:@supabase/supabase-js@2";

/** Read one setting with the service role; returns the fallback if missing or unreadable. */
export const getSetting = async <T>(key: string, fallback: T): Promise<T> => {
  try {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data } = await db.from("app_settings").select("value").eq("key", key).maybeSingle();
    const v = data?.value;
    if (v === null || v === undefined || typeof v !== typeof fallback) return fallback;
    return v as T;
  } catch {
    return fallback;
  }
};
