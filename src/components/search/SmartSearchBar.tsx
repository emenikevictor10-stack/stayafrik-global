import { useState } from "react";
import { Search, X, MapPin, Locate, Clock } from "lucide-react";
import { toast } from "sonner";
import { matchLocations, type LocationEntry } from "@/lib/location-search";

const RECENTS_KEY = "stay:recent-searches:v1";

const readRecents = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) || "[]");
  } catch {
    return [];
  }
};
const pushRecent = (q: string) => {
  if (!q.trim()) return;
  const list = [q, ...readRecents().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 5);
  localStorage.setItem(RECENTS_KEY, JSON.stringify(list));
};

export const SmartSearchBar = ({
  value,
  onChange,
  onLocate,
  placeholder = "Search city, neighbourhood…",
  rightSlot,
  places = [],
  loading = false,
}: {
  value: string;
  onChange: (v: string) => void;
  onLocate?: (coords: { lat: number; lng: number }) => void;
  placeholder?: string;
  rightSlot?: React.ReactNode;
  places?: LocationEntry[];
  loading?: boolean;
}) => {
  const [focused, setFocused] = useState(false);
  const [recents, setRecents] = useState<string[]>(() => readRecents());
  const [locating, setLocating] = useState(false);

  const commit = (v: string) => {
    onChange(v);
    pushRecent(v);
    setRecents(readRecents());
    setFocused(false);
    (document.activeElement as HTMLElement | null)?.blur();
  };

  const handleLocate = () => {
    if (!navigator.geolocation) {
      toast.error("Location not supported on this device");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onLocate?.({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast.success("Showing stays near you");
      },
      () => {
        setLocating(false);
        toast.error("Couldn't get your location");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    );
  };

  const placeMatches = matchLocations(places, value);
  const popular = places.filter((p) => p.kind !== "state").slice(0, 9).map((p) => p.label);
  const showDropdown = focused && (placeMatches.length > 0 || recents.length > 0 || !value);
  const kindLabel = { area: "Neighbourhood", city: "City", state: "State" } as const;

  return (
    <div className="relative">
      <div className="flex items-center gap-3 px-4 py-3 rounded-full bg-card border border-border focus-within:border-primary">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit(value);
          }}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Clear search"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {onLocate && (
          <button
            type="button"
            onClick={handleLocate}
            disabled={locating}
            aria-label="Use my location"
            className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-primary px-2 py-1 rounded-full hover:bg-primary/10"
          >
            <Locate className={`w-3.5 h-3.5 ${locating ? "animate-pulse" : ""}`} />
            <span className="hidden sm:inline">Near me</span>
          </button>
        )}
        {rightSlot}
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-2 z-40 rounded-2xl bg-card border border-border shadow-xl overflow-hidden">
          {loading && (
            <div className="px-4 py-2.5 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              Loading stays…
            </div>
          )}
          {placeMatches.length > 0 && (
            <div className="py-1">
              <div className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Places with stays
              </div>
              {placeMatches.map((e) => (
                <button
                  key={`${e.kind}-${e.label}`}
                  type="button"
                  onMouseDown={(ev) => ev.preventDefault()}
                  onClick={() => commit(e.label)}
                  className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-secondary"
                >
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{e.label}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {kindLabel[e.kind]}
                    </div>
                  </div>
                  {e.partner && (
                    <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">Partner</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {placeMatches.length === 0 && recents.length > 0 && (
            <div className="py-1">
              <div className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Recent searches
              </div>
              {recents.map((r) => (
                <button
                  key={r}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => commit(r)}
                  className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-secondary"
                >
                  <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate">{r}</span>
                </button>
              ))}
            </div>
          )}

          {!value && popular.length > 0 && (
            <div className="py-1 border-t border-border">
              <div className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Popular places
              </div>
              <div className="flex flex-wrap gap-1.5 px-4 pb-3 pt-1">
                {popular.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => commit(p)}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-secondary hover:bg-primary/10 border border-border"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
