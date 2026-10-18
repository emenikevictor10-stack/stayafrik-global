import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { PriceHints } from "./DatesCalendar";
import type { LocationEntry } from "@/lib/location-search";
import { EMPTY_SEARCH, parseSearch, rememberSearch, serializeSearch, type SearchState } from "@/lib/search-state";

export type Segment = "where" | "when" | "who";

type Ctx = {
  search: SearchState; // committed (in the web address)
  draft: SearchState; // being edited in the bar / modal
  patch: (p: Partial<SearchState>) => void;
  setDraft: (s: SearchState) => void;
  commit: (s?: SearchState) => void;
  clearAll: () => void;
  active: Segment | null;
  setActive: (s: Segment | null) => void;
  places: LocationEntry[];
  hints: PriceHints;
  onLocate?: (c: { lat: number; lng: number }) => void;
};

const SearchCtx = createContext<Ctx | null>(null);

export const SearchProvider = ({ places, hints, onLocate, children }: { places: LocationEntry[]; hints: PriceHints; onLocate?: Ctx["onLocate"]; children: React.ReactNode }) => {
  const [params, setParams] = useSearchParams();
  const search = useMemo(() => parseSearch(params), [params]);
  const [draft, setDraft] = useState<SearchState>(search);
  const [active, setActive] = useState<Segment | null>(null);

  // Keep the draft in sync when the address changes (back button, shared links).
  useEffect(() => { setDraft(search); rememberSearch(search); }, [search]);

  const patch = useCallback((p: Partial<SearchState>) => setDraft((d) => ({ ...d, ...p })), []);
  const commit = useCallback((s?: SearchState) => {
    const next = s || draft;
    setParams(serializeSearch(next));
    rememberSearch(next);
    setActive(null);
  }, [draft, setParams]);
  const clearAll = useCallback(() => setDraft(EMPTY_SEARCH), []);

  return (
    <SearchCtx.Provider value={{ search, draft, patch, setDraft, commit, clearAll, active, setActive, places, hints, onLocate }}>
      {children}
    </SearchCtx.Provider>
  );
};

export const useSearch = () => {
  const c = useContext(SearchCtx);
  if (!c) throw new Error("useSearch must be used inside SearchProvider");
  return c;
};
