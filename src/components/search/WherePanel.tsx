import { useEffect, useMemo, useState } from "react";
import { MapPin, Navigation, Building2, Landmark, Home } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { matchLocations, type LocationEntry } from "@/lib/location-search";

const KIND = { area: "Neighbourhood", city: "City", state: "State" } as const;
const TILE = ["bg-info/15 text-info", "bg-primary/15 text-primary", "bg-success/15 text-success", "bg-destructive/15 text-destructive"];
const ICON = { area: Home, city: Building2, state: Landmark } as const;

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

/** Suggestions list. Keyboard is driven by the input owner via `cursor`. */
export const useWhereResults = (places: LocationEntry[], query: string) => {
  const [debounced, setDebounced] = useState(query);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (query.trim().length < 2) { setDebounced(query); setPending(false); return; }
    setPending(true);
    const t = setTimeout(() => { setDebounced(query); setPending(false); }, 250);
    return () => clearTimeout(t);
  }, [query]);
  const typing = debounced.trim().length >= 2;
  const results = useMemo(() => (typing ? matchLocations(places, debounced, 8) : places.filter((p) => p.kind !== "state").slice(0, 6)), [places, debounced, typing]);
  return { results, typing, pending };
};

export const WherePanel = ({
  query, places, results, typing, pending, cursor, onPick, onNearby, listId,
}: {
  query: string;
  places: LocationEntry[];
  results: LocationEntry[];
  typing: boolean;
  pending: boolean;
  cursor: number;
  onPick: (label: string) => void;
  onNearby?: () => void;
  listId: string;
}) => (
  <div>
    {pending ? (
      <div className="flex justify-center gap-1.5 py-8" aria-label="Loading">
        {[0, 1, 2].map((i) => <span key={i} className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />)}
      </div>
    ) : (
      <>
        {!typing && <div className="text-xs font-semibold mb-2 px-2">Suggested destinations</div>}
        <ul role="listbox" id={listId} className="space-y-0.5">
          {!typing && onNearby && (
            <li role="option" aria-selected={cursor === -1}>
              <button type="button" onClick={onNearby} className="w-full flex items-center gap-4 p-2 rounded-xl hover:bg-search-hover text-left">
                <span className="w-14 h-14 rounded-xl bg-info/15 text-info flex items-center justify-center shrink-0"><Navigation className="w-6 h-6" /></span>
                <span><span className="block text-sm font-medium">Nearby</span><span className="block text-sm text-muted-foreground">Find what's around you</span></span>
              </button>
            </li>
          )}
          {results.map((e, i) => {
            const Icon = typing ? MapPin : ICON[e.kind];
            return (
              <li key={`${e.kind}-${e.label}`} role="option" aria-selected={cursor === i} id={`${listId}-${i}`}>
                <button type="button" onMouseDown={(ev) => ev.preventDefault()} onClick={() => onPick(e.label)}
                  className={cn("w-full flex items-center gap-4 p-2 rounded-xl hover:bg-search-hover text-left", cursor === i && "bg-search-hover")}>
                  <span className={cn("rounded-xl flex items-center justify-center shrink-0", typing ? "w-12 h-12 bg-search-hover" : `w-14 h-14 ${TILE[i % TILE.length]}`)}>
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="min-w-0">
                    <span className={cn("block text-sm truncate", typing ? "text-muted-foreground" : "font-medium")}>{typing ? <Bold text={e.label} q={query.trim()} /> : e.label}</span>
                    <span className="block text-xs text-muted-foreground truncate">{KIND[e.kind]}{e.city && e.city !== e.name ? ` · ${e.city}` : ""}{!typing && e.partner && e.local ? " · Popular" : ""}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {typing && !results.length && <p className="px-2 py-4 text-sm text-muted-foreground">We'll search every stay for "{query}".</p>}
        {!typing && !places.length && <p className="px-2 py-2 text-xs text-muted-foreground">Loading places…</p>}
      </>
    )}
  </div>
);
