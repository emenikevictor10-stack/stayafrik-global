import { useMemo, useState } from "react";
import { MapPin, Navigation, Building2, Map as MapIcon, Home, Globe2, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useLocationSearch, usePopularPlaces, recentPlaces, type PlaceSuggestion, type StaySuggestion,
} from "@/hooks/useLocationSearch";

export type WhereItem = PlaceSuggestion | StaySuggestion;

const ICON = { neighbourhood: MapPin, city: Building2, state: MapIcon } as const;

const Bold = ({ text, q }: { text: string; q: string }) => {
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<b className="font-bold text-foreground">{text.slice(i, i + q.length)}</b>{text.slice(i + q.length)}</>;
};

export const requestNearby = (onLocate?: (c: { lat: number; lng: number }) => void, done?: () => void) => {
  if (!navigator.geolocation) return toast.error("Location not supported on this device");
  navigator.geolocation.getCurrentPosition(
    (pos) => { onLocate?.({ lat: pos.coords.latitude, lng: pos.coords.longitude }); done?.(); toast.success("Showing stays near you"); },
    () => toast.error("Couldn't get your location"),
    { timeout: 8000, maximumAge: 60000 },
  );
};

/** Suggestions for the Where box. `items` is the keyboard order (places, then stays / recent, then popular). */
export const useWhereResults = (_places: unknown, query: string) => {
  const live = useLocationSearch(query);
  const popular = usePopularPlaces();
  const [recent] = useState(recentPlaces);
  const items: WhereItem[] = useMemo(() => {
    if (live.typing) return [...live.places, ...live.stays];
    const seen = new Set(recent.map((r) => r.id));
    return [...recent, ...popular.filter((p) => !seen.has(p.id))];
  }, [live.typing, live.places, live.stays, recent, popular]);
  return { ...live, items, recent, popular };
};

const Row = ({ item, q, active, id, onPick }: { item: WhereItem; q: string; active: boolean; id: string; onPick: (i: WhereItem) => void }) => {
  const Icon = item.kind === "stay" ? Home : ICON[item.type];
  const title = item.kind === "stay" ? item.title : item.name;
  const sub = item.kind === "stay" ? item.subtitle || "Stay" : item.breadcrumb || "Nigeria";
  return (
    <li role="option" aria-selected={active} id={id}>
      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(item)}
        className={cn("w-full flex items-center gap-4 p-2 rounded-xl hover:bg-search-hover text-left", active && "bg-search-hover")}>
        <span className="w-12 h-12 rounded-xl bg-search-hover flex items-center justify-center shrink-0"><Icon className="w-5 h-5" /></span>
        <span className="min-w-0">
          <span className="block text-sm truncate text-muted-foreground"><Bold text={title} q={q} /></span>
          <span className="block text-xs text-muted-foreground truncate">{sub}</span>
        </span>
      </button>
    </li>
  );
};

const Head = ({ children }: { children: React.ReactNode }) => <div className="text-xs font-semibold mt-3 mb-1 px-2 first:mt-0">{children}</div>;

const Dots = () => (
  <span className="inline-flex gap-1 ml-2 align-middle" aria-label="Loading">
    {[0, 1, 2].map((i) => <span key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />)}
  </span>
);

export const WherePanel = ({
  query, results, cursor, onPick, onNearby, onFlexible, listId,
}: {
  query: string;
  results: ReturnType<typeof useWhereResults>;
  cursor: number;
  onPick: (item: WhereItem) => void;
  onNearby?: () => void;
  onFlexible?: () => void;
  listId: string;
  // legacy props ignored
  [k: string]: unknown;
}) => {
  const { typing, pending, places, stays, recent, popular, items, searched } = results;
  const q = query.trim();
  const idx = (item: WhereItem) => items.indexOf(item);
  const row = (item: WhereItem) => (
    <Row key={`${item.kind}-${item.id}`} item={item} q={typing ? q : ""} active={cursor === idx(item)} id={`${listId}-${idx(item)}`} onPick={onPick} />
  );
  const popularShown = popular.filter((p) => !recent.some((r) => r.id === p.id));

  return (
    <div>
      {typing ? (
        <>
          <ul role="listbox" id={listId} className="space-y-0.5">
            {places.length > 0 && <Head>Places{pending && <Dots />}</Head>}
            {places.map(row)}
            {stays.length > 0 && <Head>Stays</Head>}
            {stays.map(row)}
          </ul>
          {!places.length && !stays.length && (pending || searched !== q ? (
            <div className="flex justify-center py-6"><Dots /></div>
          ) : (
            <>
              <p className="px-2 py-3 text-sm text-muted-foreground">No places match "{q}"</p>
              {popular.length > 0 && <Head>Popular destinations</Head>}
              <ul className="space-y-0.5">
                {popular.map((p) => <Row key={p.id} item={p} q="" active={false} id={`${listId}-pop-${p.id}`} onPick={onPick} />)}
              </ul>
            </>
          ))}
        </>
      ) : (
        <ul role="listbox" id={listId} className="space-y-0.5">
          {onNearby && (
            <li role="option" aria-selected={false}>
              <button type="button" onClick={onNearby} className="w-full flex items-center gap-4 p-2 rounded-xl hover:bg-search-hover text-left">
                <span className="w-12 h-12 rounded-xl bg-info/15 text-info flex items-center justify-center shrink-0"><Navigation className="w-5 h-5" /></span>
                <span><span className="block text-sm font-medium">Nearby</span><span className="block text-xs text-muted-foreground">Find what's around you</span></span>
              </button>
            </li>
          )}
          {onFlexible && (
            <li role="option" aria-selected={false}>
              <button type="button" onClick={onFlexible} className="w-full flex items-center gap-4 p-2 rounded-xl hover:bg-search-hover text-left">
                <span className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0"><Globe2 className="w-5 h-5" /></span>
                <span><span className="block text-sm font-medium">I'm flexible</span><span className="block text-xs text-muted-foreground">Search all of Nigeria</span></span>
              </button>
            </li>
          )}
          {recent.length > 0 && <Head><Clock className="inline w-3 h-3 mr-1" />Recent searches</Head>}
          {recent.map(row)}
          {popularShown.length > 0 && <Head>Popular destinations</Head>}
          {popularShown.map(row)}
        </ul>
      )}
    </div>
  );
};

/** What picking a place writes into the search (a place from the list, not free text). */
export const placePatch = (p: PlaceSuggestion) => ({ where: p.name, loc: p.slug, locType: p.type });

/** Typed text but nothing picked → use the top suggestion when there is one. */
export const autoPick = <T extends { where: string; loc?: string }>(draft: T, r: ReturnType<typeof useWhereResults>): T => {
  if (!draft.where.trim() || draft.loc) return draft;
  const top = r.places[0];
  return top ? { ...draft, ...placePatch(top) } : draft;
};
