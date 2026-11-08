import { useLocations } from "@/hooks/useLocations";
import { TopBar } from "@/components/shell/TopBar";
import { PropertyCard } from "@/components/property/PropertyCard";
import { type Property } from "@/data/properties";
import { Map as MapIcon, List as ListIcon, X, Sparkles, Wallet, Star, Users, Zap, Laptop, Gem, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { PropertiesMap } from "@/components/map/PropertyMap";
import { useSettings } from "@/hooks/useSettings";
import { useListings } from "@/hooks/useListings";
import { Seo } from "@/components/seo/Seo";
import { SearchProvider, useSearch, type Segment } from "@/components/search/SearchProvider";
import { SearchBar, CompactSearchBar } from "@/components/search/SearchBar";
import { MobileSearchPill, MobileSearchModal } from "@/components/search/MobileSearchModal";
import { usePriceHints } from "@/hooks/usePriceHints";
import { useIsMobile } from "@/hooks/use-mobile";
import { parseSearch, serializeSearch, guestCount, nightsOf, fitsGuests, summarize, type SearchState } from "@/lib/search-state";
import { useSearchAvailability } from "@/hooks/useSearchAvailability";
import { searchProperties, buildLocationIndex, rescueCities } from "@/lib/location-search";

// Haversine in km
const distKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

type SmartFilter = "budget" | "toprated" | "family" | "power" | "workstay" | "luxury";

const SMART_FILTERS: { key: SmartFilter; label: string; Icon: LucideIcon; hint: string }[] = [
  { key: "budget", label: "Budget friendly", Icon: Wallet, hint: "Under ₦100k / night" },
  { key: "toprated", label: "Top rated", Icon: Star, hint: "4.5+ rating" },
  { key: "family", label: "Family size", Icon: Users, hint: "3+ bedrooms" },
  { key: "power", label: "Never dark", Icon: Zap, hint: "Generator / inverter" },
  { key: "workstay", label: "Work stay", Icon: Laptop, hint: "Fast Wi-Fi" },
  { key: "luxury", label: "Luxury", Icon: Gem, hint: "Premium homes" },
];

const hasAmenity = (p: Property, words: string[]) =>
  p.amenities.some((a) => words.some((w) => a.label.toLowerCase().includes(w)));

const matchesSmart = (p: Property, f: SmartFilter) => {
  switch (f) {
    case "budget": return p.priceNum > 0 && p.priceNum <= 100000;
    case "toprated": return p.rating >= 4.5;
    case "family": return p.beds >= 3 || hasAmenity(p, ["family friendly"]);
    case "power": return hasAmenity(p, ["generator", "inverter", "solar", "power", "electricity"]);
    case "workstay": return hasAmenity(p, ["wi-fi", "wifi", "internet"]);
    case "luxury": return p.priceNum >= 200000 || hasAmenity(p, ["pool", "gym", "swimming pool", "hot tub", "cinema"]);
  }
};

/** Search area: desktop pill + compact sticky bar, or phone pill + full-screen sheet. */
const ExploreSearch = ({ mapToggle }: { mapToggle: React.ReactNode }) => {
  const isMobile = useIsMobile();
  const { setActive, active } = useSearch();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [floating, setFloating] = useState(false);
  const anchor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = anchor.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setScrolled(!e.isIntersecting), { rootMargin: "-80px 0px 0px 0px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [isMobile]);
  useEffect(() => { if (!active) setFloating(false); }, [active]);
  // /search (or ?open=1) opens the search box straight away.
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname !== "/search" && !new URLSearchParams(window.location.search).has("open")) return;
    if (isMobile) setMobileOpen(true); else setActive("where");
  }, [pathname, isMobile]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isMobile) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0"><MobileSearchPill onOpen={() => setMobileOpen(true)} /></div>
        {mapToggle}
        <MobileSearchModal open={mobileOpen} onOpenChange={setMobileOpen} />
      </div>
    );
  }
  const openFloating = (s: Segment) => { setFloating(true); setActive(s); };
  return (
    <>
      <div ref={anchor} className="flex items-center gap-3">
        <SearchBar panels={!floating} className="flex-1" />
        {mapToggle}
      </div>
      {scrolled && !floating && (
        <div className="fixed top-[76px] left-0 right-0 z-40 px-4 pointer-events-none">
          <div className="pointer-events-auto"><CompactSearchBar onOpen={openFloating} /></div>
        </div>
      )}
      {floating && (
        <>
          <div className="fixed inset-0 z-40 bg-background/60 backdrop-blur-[2px] animate-fade-in" aria-hidden />
          <div className="fixed top-[76px] left-0 right-0 z-50 px-4">
            <SearchBar onClosed={() => setFloating(false)} />
          </div>
        </>
      )}
    </>
  );
};

const Explore = () => {
  const [params, setParams] = useSearchParams();
  const search = useMemo(() => parseSearch(params), [params]);
  const q = search.where;
  const applySearch = (s: SearchState) => setParams(serializeSearch(s));
  const setQ = (where: string) => applySearch({ ...search, where });
  const [smart, setSmart] = useState<SmartFilter[]>([]);
  const [view, setView] = useState<"list" | "map">("list");
  const { features } = useSettings();
  const [nearMe, setNearMe] = useState<{ lat: number; lng: number } | null>(null);
  const [selected, setSelected] = useState<Property | null>(null);
  const { data: properties, loading: listLoading, loadingMore, hasMore, loadMore, searchPartner, searching } = useListings();
  const { all: allPlaces, byId: placeById } = useLocations();
  const picked = useMemo(() => (search.loc ? allPlaces.find((l) => l.slug === search.loc) : undefined), [allPlaces, search.loc]);
  const pickedParent = picked?.parent_id ? placeById.get(picked.parent_id) : undefined;
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Debounced server-side partner search so any RayProp area is findable
  useEffect(() => {
    if (search.loc && !picked) return; // wait for the place list to resolve the link
    const t = window.setTimeout(() => {
      const query = q.trim();
      if (picked) searchPartner(picked.name, picked.id);
      else searchPartner(query.length >= 3 ? query : null);
    }, 400);
    return () => window.clearTimeout(t);
  }, [q, searchPartner, search.loc, picked]);

  // Auto-load more partner stays as the guest scrolls near the bottom
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) loadMore();
    }, { rootMargin: "600px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadMore]);

  const toggleSmart = (k: SmartFilter) =>
    setSmart((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

  const places = useMemo(() => buildLocationIndex(properties), [properties]);

  // While a place search is still fetching partner stays, show the loading cards instead of "no results".
  const loading = listLoading || (searching && !!(picked || q));
  const { list, fallbackCity } = useMemo(() => {
    const shortlets = properties.filter((p) => p.type === "Shortlet");
    // Place picked from the list → match by place (Lekki includes Chevron); partner stays already come filtered by place.
    const { results, fallbackCity } = picked
      ? { results: shortlets.filter((p) => (p.source === "rayprop" ? true : !!p.placeIds?.includes(picked.id))), fallbackCity: null as string | null }
      : searchProperties(shortlets, q);
    let out = results.filter((p) => smart.every((f) => matchesSmart(p, f)));
    if (smart.includes("budget")) out = [...out].sort((a, b) => a.priceNum - b.priceNum);
    else if (smart.includes("toprated")) out = [...out].sort((a, b) => b.rating - a.rating);
    if (nearMe) {
      out = out
        .map((p) => ({ p, d: distKm(nearMe, { lat: p.lat, lng: p.lng }) }))
        .sort((a, b) => a.d - b.d)
        .map((x) => x.p);
    }
    const g = guestCount(search);
    if (g) out = out.filter((p) => fitsGuests(p, g));
    if (search.pets) out = out.filter((p) => hasAmenity(p, ["pet"]));
    if (search.bedrooms) out = out.filter((p) => (p.beds || 0) >= search.bedrooms);
    if (search.mode === "flexible" && !smart.length && !nearMe) out = [...out].sort((a, b) => (a.priceNum || Infinity) - (b.priceNum || Infinity));
    return { list: out, fallbackCity };
  }, [properties, q, smart, nearMe, search, picked]);

  const { unavailable, checking } = useSearchAvailability(list, search.mode === "dates" ? search.checkIn : undefined, search.mode === "dates" ? search.checkOut : undefined, search.flex);
  const hints = usePriceHints(useMemo(() => (q ? list.filter((p) => p.source === "rayprop") : []), [list, q]), q);
  const visible = useMemo(() => list.filter((p) => !unavailable.has(p.id)), [list, unavailable]);
  const nights = nightsOf(search);
  const hasSearch = !!(q || search.checkIn || search.months.length || guestCount(search) || search.pets || search.bedrooms);
  const heading = picked ? `Stays in ${picked.name}${pickedParent && picked.type !== "state" ? `, ${pickedParent.name}` : ""}` : q ? `Stays matching "${q}"` : "";


  return (
    <>
      <Seo
        title="Explore verified shortlets in Nigeria | Stay"
        description="Search verified shortlets in Lagos, Abuja, Port Harcourt and more. Book partner and local stays securely."
      />
      <TopBar title="Explore" />
      <main className="px-5 pt-5 pb-8">
        <SearchProvider places={places} hints={hints} onLocate={(c) => { setNearMe(c); if (features.map) setView("map"); }}>
          <ExploreSearch
            mapToggle={!features.map ? null :
              <button
                onClick={() => setView(view === "list" ? "map" : "list")}
                className="shrink-0 w-12 h-12 rounded-full bg-search-surface border border-border shadow-search flex items-center justify-center text-primary"
                aria-label="Toggle map view"
              >
                {view === "list" ? <MapIcon className="w-4 h-4" /> : <ListIcon className="w-4 h-4" />}
              </button>
            }
          />
        </SearchProvider>

        {nearMe && (
          <button
            type="button"
            onClick={() => setNearMe(null)}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary px-2.5 py-1 rounded-full bg-primary/10 border border-primary/30"
          >
            📍 Sorted by distance · clear <X className="w-3 h-3" />
          </button>
        )}

        {/* AI-optimised quick filters */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5 mt-4 pb-1">
          <button
            onClick={() => setSmart([])}
            className={cn(
              "shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors",
              smart.length === 0
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border",
            )}
          >
            <Sparkles className="w-3.5 h-3.5" aria-hidden /> All
          </button>
          {SMART_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => toggleSmart(f.key)}
              title={f.hint}
              className={cn(
                "shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors",
                smart.includes(f.key)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border",
              )}
            >
              <f.Icon className="w-3.5 h-3.5" aria-hidden />
              {f.label}
            </button>
          ))}
        </div>
        {hasSearch && !loading && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {heading && <h2 className="w-full text-base font-bold text-foreground">{heading}</h2>}
            <span className="font-semibold text-foreground">{summarize(search).where} · {summarize(search).when} · {summarize(search).who}</span>
            {checking && <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />Checking dates…</span>}
            {fallbackCity && (
              <span>No exact match for "{q}" — showing other {fallbackCity} stays</span>
            )}
            <button type="button" onClick={() => setParams(new URLSearchParams())} className="font-semibold text-primary underline">Clear search</button>
          </div>
        )}
        {smart.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {SMART_FILTERS.filter((f) => smart.includes(f.key)).map((f) => f.hint).join(" · ")}
          </p>
        )}


        {view === "map" && features.map ? (
          <div className="mt-5 relative">
            <PropertiesMap list={visible} height={520} onSelect={setSelected} />
            {selected && (
              <div className="absolute left-3 right-3 bottom-3 z-10">
                <div className="rounded-2xl bg-card border border-border shadow-xl p-3 flex gap-3 items-center">
                  <img
                    src={selected.image}
                    alt={selected.title}
                    className="w-16 h-16 rounded-xl object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{selected.title}</div>
                    <div className="text-xs text-muted-foreground truncate">📍 {selected.location}</div>
                    <div className="text-primary font-extrabold text-sm mt-0.5">{selected.price} <span className="text-xs font-medium text-muted-foreground">/night</span></div>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    aria-label="Close"
                    className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <Link
                    to={`/stays/${selected.id}`}
                    className="text-xs font-bold bg-primary text-primary-foreground px-3 py-2 rounded-full"
                  >
                    View
                  </Link>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-5">
            {loading && (
              <div className="col-span-full text-center py-16 text-muted-foreground text-sm">
                <div className="w-6 h-6 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin mb-2" />
                Loading properties…
              </div>
            )}
            {!loading && visible.map((p) => (
              <PropertyCard key={p.id} p={p} nights={nights} />
            ))}
            {!loading && visible.length === 0 && (
              <div className="text-center py-16 text-muted-foreground text-sm">
                <div className="text-4xl mb-2">🔍</div>
                No properties match your search.
                {q && rescueCities(properties, q).length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs mb-2">Try these places instead:</div>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {rescueCities(properties, q).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setQ(c)}
                          className="text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary hover:bg-primary/10 border border-border"
                        >
                          Stays in {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {q && (
                  <div>
                    <button type="button" onClick={() => setQ("")} className="mt-3 text-xs font-semibold text-primary underline">Show all stays</button>
                  </div>
                )}
                {smart.length > 0 && (
                  <div>
                    <button type="button" onClick={() => setSmart([])} className="mt-3 text-xs font-semibold text-primary underline">Clear filters</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {view === "list" && !loading && visible.length > 0 && (
          <div ref={sentinelRef} className="py-6 text-center">
            {loadingMore && (
              <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                Loading more stays…
              </div>
            )}
            {!hasMore && !loadingMore && properties.some((p) => p.source === "rayprop") && (
              <div className="text-xs text-muted-foreground">That's everything ✨</div>
            )}
          </div>
        )}
      </main>
    </>
  );
};

export default Explore;
