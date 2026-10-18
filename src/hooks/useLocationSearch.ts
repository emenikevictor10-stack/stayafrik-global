import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PlaceSuggestion = {
  kind: "place"; id: string; name: string; slug: string;
  type: "state" | "city" | "neighbourhood"; breadcrumb: string; listing_count: number;
};
export type StaySuggestion = { kind: "stay"; id: string; title: string; subtitle: string };

const clean = (s: string) => (s || "").replace(/[\u200B-\u200F\u2060\uFEFF]/g, "");

/** Live place + stay suggestions: 150 ms pause, stale requests dropped, old results kept while loading. */
export const useLocationSearch = (query: string) => {
  const [places, setPlaces] = useState<PlaceSuggestion[]>([]);
  const [stays, setStays] = useState<StaySuggestion[]>([]);
  const [pending, setPending] = useState(false);
  const [searched, setSearched] = useState("");
  const seq = useRef(0);
  const q = query.trim();
  const typing = q.length >= 2;

  useEffect(() => {
    if (!typing) { setPending(false); setPlaces([]); setStays([]); setSearched(""); return; }
    const ctrl = new AbortController();
    const mine = ++seq.current;
    setPending(true);
    const t = window.setTimeout(async () => {
      const [p, s] = await Promise.all([
        supabase.rpc("search_locations", { q, _limit: 8 }).abortSignal(ctrl.signal),
        q.length >= 3 ? supabase.rpc("search_stays", { q, _limit: 3 }).abortSignal(ctrl.signal) : Promise.resolve({ data: [] as any[] }),
      ]);
      if (ctrl.signal.aborted || mine !== seq.current) return;
      setPlaces(((p.data as any[]) || []).map((r) => ({ kind: "place", ...r })));
      setStays(((s.data as any[]) || []).map((r) => ({ kind: "stay", id: r.id, title: clean(r.title), subtitle: r.subtitle || "" })));
      setSearched(q);
      setPending(false);
    }, 150);
    return () => { window.clearTimeout(t); ctrl.abort(); };
  }, [q, typing]);

  return { places, stays, pending, typing, searched };
};

/** Busiest places, shown before the guest types. */
export const usePopularPlaces = () => {
  const [rows, setRows] = useState<PlaceSuggestion[]>([]);
  useEffect(() => {
    supabase.rpc("popular_locations", { _limit: 6 }).then(({ data }) =>
      setRows(((data as any[]) || []).map((r) => ({ kind: "place", ...r }))));
  }, []);
  return rows;
};

const RECENT = "stay:recent-places";
export const recentPlaces = (): PlaceSuggestion[] => {
  try { return (JSON.parse(localStorage.getItem(RECENT) || "[]") as PlaceSuggestion[]).slice(0, 5); } catch { return []; }
};
export const rememberPlace = (p: PlaceSuggestion) => {
  try {
    const next = [p, ...recentPlaces().filter((x) => x.id !== p.id)].slice(0, 5);
    localStorage.setItem(RECENT, JSON.stringify(next));
  } catch { /* ignore */ }
};
