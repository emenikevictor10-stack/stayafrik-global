import { useEffect, useState } from "react";
import { format, addDays, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { raypropAvailability } from "@/lib/rayprop";
import { rangesToBlockedSet, type DateRange } from "@/lib/blocked-dates";
import type { Property } from "@/data/properties";
import { anyWindowFree, flexSpan } from "@/lib/search-state";

const cache = new Map<string, Set<string>>(); // `${id}|${from}|${to}` -> blocked nights
const MAX_LOCAL = 60;
const MAX_PARTNER = 30;

const blockedFor = async (p: Property, from: string, to: string): Promise<Set<string>> => {
  if (p.source === "rayprop") {
    const days = await raypropAvailability(p.raypropListingId || p.id.replace(/^rp_/, ""), from, to);
    return new Set((Array.isArray(days) ? days : []).filter((d: any) => d?.available === false && d?.date).map((d: any) => String(d.date)));
  }
  const { data, error } = await supabase.rpc("listing_booked_ranges", { _listing_id: p.id });
  if (error) throw error;
  return rangesToBlockedSet((data as DateRange[]) || []);
};

/** Ids of shown stays with no free window for the chosen dates (± flex). Unknown = kept (rechecked at booking). */
export const useSearchAvailability = (list: Property[], checkIn?: string, checkOut?: string, flex = 0) => {
  const [unavailable, setUnavailable] = useState<Set<string>>(new Set());
  const [checking, setChecking] = useState(false);
  const ids = list.map((p) => p.id).join(",");

  useEffect(() => {
    if (!checkIn || !checkOut) { setUnavailable(new Set()); setChecking(false); return; }
    let active = true;
    const [from, rawTo] = flexSpan(checkIn, checkOut, flex);
    const to = format(addDays(parseISO(rawTo), 1), "yyyy-MM-dd");
    const targets = [
      ...list.filter((p) => p.source !== "rayprop").slice(0, MAX_LOCAL),
      ...list.filter((p) => p.source === "rayprop").slice(0, MAX_PARTNER),
    ];
    const key = (p: Property) => `${p.id}|${from}|${to}`;
    const collect = () => new Set(targets.filter((p) => {
      const b = cache.get(key(p));
      return b && !anyWindowFree(b, checkIn, checkOut, flex);
    }).map((p) => p.id));
    const todo = targets.filter((p) => !cache.has(key(p)));
    setUnavailable(collect());
    if (!todo.length) { setChecking(false); return; }
    setChecking(true);
    (async () => {
      let i = 0;
      const worker = async () => {
        while (i < todo.length && active) {
          const p = todo[i++];
          try { cache.set(key(p), await blockedFor(p, from, to)); } catch { /* keep visible */ }
        }
      };
      await Promise.all(Array.from({ length: 5 }, worker));
      if (active) { setUnavailable(collect()); setChecking(false); }
    })();
    return () => { active = false; };
  }, [ids, checkIn, checkOut, flex]); // eslint-disable-line react-hooks/exhaustive-deps

  return { unavailable, checking };
};
