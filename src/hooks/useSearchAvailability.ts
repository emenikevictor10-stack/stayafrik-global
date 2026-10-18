import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { raypropAvailability } from "@/lib/rayprop";
import { rangesToBlockedSet, type DateRange } from "@/lib/blocked-dates";
import type { Property } from "@/data/properties";
import { overlapsBlocked } from "@/lib/search-state";

const cache = new Map<string, boolean>(); // `${id}|${in}|${out}` -> unavailable
const MAX_LOCAL = 60;
const MAX_PARTNER = 30;

const checkOne = async (p: Property, checkIn: string, checkOut: string): Promise<boolean> => {
  if (p.source === "rayprop") {
    const days = await raypropAvailability(p.raypropListingId || p.id.replace(/^rp_/, ""), checkIn, checkOut);
    return (Array.isArray(days) ? days : []).some((d: any) => d?.date >= checkIn && d?.date < checkOut && d?.available === false);
  }
  const { data, error } = await supabase.rpc("listing_booked_ranges", { _listing_id: p.id });
  if (error) throw error;
  return overlapsBlocked(rangesToBlockedSet((data as DateRange[]) || []), checkIn, checkOut);
};

/** Ids of shown stays that are booked on the chosen dates. Unknown = kept (rechecked at booking). */
export const useSearchAvailability = (list: Property[], checkIn?: string, checkOut?: string) => {
  const [unavailable, setUnavailable] = useState<Set<string>>(new Set());
  const [checking, setChecking] = useState(false);
  const ids = list.map((p) => p.id).join(",");

  useEffect(() => {
    if (!checkIn || !checkOut) { setUnavailable(new Set()); return; }
    let active = true;
    const targets = [
      ...list.filter((p) => p.source !== "rayprop").slice(0, MAX_LOCAL),
      ...list.filter((p) => p.source === "rayprop").slice(0, MAX_PARTNER),
    ];
    const key = (p: Property) => `${p.id}|${checkIn}|${checkOut}`;
    const collect = () => new Set(targets.filter((p) => cache.get(key(p))).map((p) => p.id));
    const todo = targets.filter((p) => !cache.has(key(p)));
    setUnavailable(collect());
    if (!todo.length) return;
    setChecking(true);
    (async () => {
      let i = 0;
      const worker = async () => {
        while (i < todo.length && active) {
          const p = todo[i++];
          try { cache.set(key(p), await checkOne(p, checkIn, checkOut)); } catch { /* keep visible */ }
        }
      };
      await Promise.all(Array.from({ length: 5 }, worker));
      if (active) { setUnavailable(collect()); setChecking(false); }
    })();
    return () => { active = false; };
  }, [ids, checkIn, checkOut]); // eslint-disable-line react-hooks/exhaustive-deps

  return { unavailable, checking };
};
