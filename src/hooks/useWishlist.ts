import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const KEY = "stay:wishlist:v1";

const read = (): string[] => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
};
const write = (ids: string[]) => { localStorage.setItem(KEY, JSON.stringify(ids)); emitter.dispatchEvent(new Event("change")); };

const emitter = new EventTarget();

/** The signed-in guest's default "Saved" list id (created on first use). */
export const ensureDefaultList = async (userId: string): Promise<string | null> => {
  const { data } = await supabase.from("wishlists").select("id").eq("user_id", userId).eq("is_default", true).maybeSingle();
  if (data?.id) return data.id;
  const { data: made } = await supabase.from("wishlists").insert({ user_id: userId, name: "Saved", is_default: true }).select("id").single();
  return made?.id ?? null;
};

/** On sign-in: device hearts move into the account, and account hearts show on this device. */
export const syncWishlist = async (userId: string) => {
  const list = await ensureDefaultList(userId);
  if (!list) return;
  const local = read();
  if (local.length) await supabase.from("wishlist_items").upsert(local.map((listing_ref) => ({ wishlist_id: list, listing_ref })), { onConflict: "wishlist_id,listing_ref", ignoreDuplicates: true });
  const { data } = await supabase.from("wishlist_items").select("listing_ref").eq("wishlist_id", list).order("added_at");
  const merged = Array.from(new Set([...(data || []).map((r) => r.listing_ref), ...local]));
  write(merged);
};

const pushToggle = async (id: string, added: boolean) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  const list = await ensureDefaultList(session.user.id);
  if (!list) return;
  if (added) await supabase.from("wishlist_items").upsert({ wishlist_id: list, listing_ref: id }, { onConflict: "wishlist_id,listing_ref", ignoreDuplicates: true });
  else await supabase.from("wishlist_items").delete().eq("wishlist_id", list).eq("listing_ref", id);
};

export const useWishlist = () => {
  const [ids, setIds] = useState<string[]>(() => read());

  useEffect(() => {
    const onChange = () => setIds(read());
    emitter.addEventListener("change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      emitter.removeEventListener("change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const toggle = useCallback((id: string) => {
    const current = read();
    const added = !current.includes(id);
    write(added ? [...current, id] : current.filter((x) => x !== id));
    void pushToggle(id, added);
    return added;
  }, []);

  const has = useCallback((id: string) => ids.includes(id), [ids]);

  return { ids, has, toggle };
};
