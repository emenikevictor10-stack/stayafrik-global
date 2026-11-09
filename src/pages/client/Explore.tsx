import { useLocations } from "@/hooks/useLocations";
import { TopBar } from "@/components/shell/TopBar";
import { PropertyCard } from "@/components/property/PropertyCard";
import { type Property } from "@/data/properties";
import { hasCoords } from "@/lib/map-pins";
import { Map as MapIcon, List as ListIcon, X, Wallet, Star, Users, Zap, BadgeCheck, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { FiltersSheet } from "@/components/search/FiltersSheet";
import { Skeleton, EmptyState, Button } from "@/ui/kit";
import { supabase } from "@/integrations/supabase/client";
import { PAGE_SIZE, applyFilters, sortStays, parseFilters, writeFilters, activeFilterCount, nearestFreeStart, addDays, emptyFilters, type Filters } from "@/lib/results";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { StayPinMap } from "@/components/map/StayPinMap";
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


const hasAmenity = (p: Property, words: string[]) =>
  p.amenities.some((a) => words.some((w) => a.label.toLowerCase().includes(w)));

/** Search area: desktop pill + compact sticky bar, or phone pill + full-screen sheet. */
const ExploreSearch = ({ mapToggle, filters }: { mapToggle: React.ReactNode; filters: React.ReactNode }) => {
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
        {filters}
        {mapToggle}
        <MobileSearchModal open={mobileOpen} onOpenChange={setMobileOpen} />
      </div>
    );
  }
  const openFloating = (s: Segment) => { setFloating(true); setActive(s); };
  return (
    <>
      <div ref={anchor} className="grid grid-cols-[3.5rem_minmax(0,1fr)_3.5rem] items-center gap-3">
        <div className="flex justify-start">{filters}</div>
        <SearchBar panels={!floating} className="min-w-0" />
        <div className="flex justify-end">{mapToggle}</div>
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
  const filters = useMemo(() => parseFilters(params), [params]);
  const setFilters = (f: Filters) => setParams(writeFilters(params, f), { replace: true });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [shown, setShown] = useState(PAGE_SIZE);
  const applySearch = (s: SearchState) => setParams(writeFilters(serializeSearch(s), filters));
  const setQ = (where: string) => applySearch({ ...search, where });
  const { pathname: routePath } = useLocation();
  // /explore opens on the map (PRD); /, /home and /results open on the list.
  const [view, setView] = useState<"list" | "map">(() => (routePath === "/explore" ? "map" : "list"));
  const { features } = useSettings();
  const [nearMe, setNearMe] = useState<{ lat: number; lng: number } | null>(null);
  const [selected, setSelected] = useState<Property | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [picker, setPicker] = useState<Property[] | null>(null);
  const [onlyUnmapped, setOnlyUnmapped] = useState(false);
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
    if (!el || !(hasMore || moreLocal)) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) showMore();
    }, { rootMargin: "400px" });
    obs.observe(el);
    return () => obs.disconnect();
  });


  const places = useMemo(() => buildLocationIndex(properties), [properties]);

  // While a place search is still fetching partner stays, show the loading cards instead of "no results".
  const loading = listLoading || (searching && !!(picked || q));
  const { base, fallbackCity } = useMemo(() => {
    const shortlets = properties.filter((p) => p.type === "Shortlet");
    // Place picked from the list → match by place (Lekki includes Chevron); partner stays already come filtered by place.
    const { results, fallbackCity } = picked
      ? { results: shortlets.filter((p) => (p.source === "rayprop" ? true : !!p.placeIds?.includes(picked.id))), fallbackCity: null as string | null }
      : searchProperties(shortlets, q);
    let out = results;
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
    if (search.mode === "flexible" && !nearMe) out = [...out].sort((a, b) => (a.priceNum || Infinity) - (b.priceNum || Infinity));
    return { base: out, fallbackCity };
  }, [properties, q, nearMe, search, picked]);
  const sortBy = (l: Property[], f: Filters) => (f.sort === "recommended" ? l : sortStays(l, f.sort));
  const list = useMemo(() => sortBy(applyFilters(base, filters), filters), [base, filters]);
  const countFor = (f: Filters) => applyFilters(base, f).length;
  const filterKey = params.toString();
  useEffect(() => setShown(PAGE_SIZE), [filterKey]);
  // Only the stays on screen (plus the next page) get a live date check.
  const checkList = useMemo(() => list.slice(0, shown + PAGE_SIZE), [list, shown]);

  const { unavailable, checking } = useSearchAvailability(checkList, search.mode === "dates" ? search.checkIn : undefined, search.mode === "dates" ? search.checkOut : undefined, search.flex);
  const hints = usePriceHints(useMemo(() => (q ? list.filter((p) => p.source === "rayprop") : []), [list, q]), q);
  const available = useMemo(() => list.filter((p) => !unavailable.has(p.id)), [list, unavailable]);
  const visible = useMemo(() => available.slice(0, shown), [available, shown]);
  const mapList = useMemo(() => available.filter(hasCoords), [available]);
  const unmapped = useMemo(() => available.filter((p) => !hasCoords(p)), [available]);
  const listForMap = onlyUnmapped ? unmapped : visible;
  const moreLocal = available.length > shown;
  const showMore = () => { if (moreLocal) setShown((n) => n + PAGE_SIZE); else if (hasMore) loadMore(); };
  const nFilters = activeFilterCount(filters);

  // No results: sibling areas with stays, and nearest open dates for local stays.
  const nearbyAreas = useMemo(() => {
    if (!picked) return [];
    const parent = picked.type === "state" ? null : picked.parent_id;
    return allPlaces.filter((l) => l.id !== picked.id && (parent ? l.parent_id === parent : l.parent_id === picked.id) && (l as { listing_count?: number }).listing_count! > 0).slice(0, 6);
  }, [picked, allPlaces]);
  const [altDates, setAltDates] = useState<string | null>(null);
  const datesKey = `${search.checkIn}|${search.checkOut}|${list.length}|${available.length}`;
  useEffect(() => {
    setAltDates(null);
    if (search.mode !== "dates" || !search.checkIn || !search.checkOut || available.length || !list.length || checking) return;
    const local = list.filter((p) => p.source !== "rayprop").slice(0, 8);
    if (!local.length) return;
    let off = false;
    const n = nightsOf(search);
    const today = new Date().toISOString().slice(0, 10);
    Promise.all(local.map((p) => supabase.rpc("listing_booked_ranges", { _listing_id: p.id }).then((r) => nearestFreeStart((r.data as { check_in: string; check_out: string }[]) || [], search.checkIn!, n, today))))
      .then((starts) => { if (off) return; const best = starts.filter(Boolean).sort((a, b) => Math.abs(+new Date(a!) - +new Date(search.checkIn!)) - Math.abs(+new Date(b!) - +new Date(search.checkIn!)))[0]; setAltDates(best || null); });
    return () => { off = true; };
  }, [datesKey, checking]); // eslint-disable-line react-hooks/exhaustive-deps
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
            filters={
              <button type="button" onClick={() => setFiltersOpen(true)} aria-label={nFilters ? `Filters, ${nFilters} on` : "Filters"}
                className="relative shrink-0 w-12 h-12 rounded-full bg-search-surface border border-border shadow-search flex items-center justify-center text-primary">
                <SlidersHorizontal className="w-4 h-4" aria-hidden />
                {nFilters > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-foreground text-background text-xs flex items-center justify-center">{nFilters}</span>}
              </button>
            }
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


        <FiltersSheet open={filtersOpen} onOpenChange={setFiltersOpen} value={filters} onApply={setFilters} countFor={countFor} />
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
        {view === "map" && features.map ? (
          <div className="mt-5 relative lg:grid lg:grid-cols-[1fr_minmax(420px,45%)] lg:gap-5 max-w-[1360px] mx-auto">
            <div className="hidden lg:grid grid-cols-2 gap-x-4 gap-y-6 content-start order-1">
              {listForMap.map((p) => <div key={p.id} onMouseEnter={() => setHoverId(p.id)} onMouseLeave={() => setHoverId(null)}><PropertyCard p={p} nights={nights} /></div>)}
              {(moreLocal || hasMore) && <div className="col-span-2 text-center"><Button variant="secondary" onClick={showMore}>More stays</Button></div>}
            </div>
            <div className="lg:order-2 lg:sticky lg:top-24 lg:self-start relative">
            <StayPinMap list={mapList} height={520} activeId={hoverId || selected?.id} onSelect={(p) => { setPicker(null); setSelected(p); }} onCluster={(items) => { setSelected(null); setPicker(items); }} />
            {unmapped.length > 0 && (
              <button type="button" onClick={() => setOnlyUnmapped((v) => !v)} className="mt-2 min-h-11 text-[13px] text-muted-foreground underline">
                {onlyUnmapped ? "Show all stays in the list" : `${unmapped.length} ${unmapped.length === 1 ? "stay isn't" : "stays aren't"} on the map yet — show ${unmapped.length === 1 ? "it" : "them"}`}
              </button>
            )}
            {picker && (
              <div className="absolute left-3 right-3 top-3 z-10 rounded-2xl bg-card border border-border shadow-xl p-2 max-h-[300px] overflow-auto" role="dialog" aria-label={`${picker.length} stays in this area`}>
                <div className="flex items-center justify-between px-1 pb-1">
                  <p className="text-[13px] font-semibold">{picker.length} stays in this area</p>
                  <button type="button" onClick={() => setPicker(null)} aria-label="Close list" className="w-11 h-11 flex items-center justify-center"><X className="w-4 h-4" /></button>
                </div>
                {picker.map((p) => (
                  <button key={p.id} type="button" onClick={() => { setPicker(null); setSelected(p); }} className="w-full min-h-11 flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-surface text-left">
                    <img src={p.image} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    <span className="flex-1 min-w-0 text-[13px] truncate">{p.title}</span>
                    <span className="text-[13px] font-semibold">{p.price}</span>
                  </button>
                ))}
              </div>
            )}
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
            <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6 mt-5">
              {listForMap.map((p) => <PropertyCard key={p.id} p={p} nights={nights} />)}
            </div>
          </div>
        ) : (
          <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-6 mt-5 max-w-[1360px] mx-auto">
            {loading && Array.from({ length: 8 }).map((_, i) => (
              <div key={i}><Skeleton className="h-[240px] md:h-[204px] rounded-xl" /><Skeleton className="h-4 w-24 mt-3" /><Skeleton className="h-3 w-40 mt-2" /></div>
            ))}
            {!loading && visible.map((p) => <PropertyCard key={p.id} p={p} nights={nights} />)}
          </div>
          {!loading && visible.length === 0 && (
            <EmptyState
              title="No stays match"
              body={nFilters ? "Try removing a filter or two." : altDates ? "These dates are taken. Stays are free on other dates nearby." : "Try a nearby area or different dates."}
              action={
                <div className="flex flex-col items-center gap-3">
                  {altDates && (
                    <Button onClick={() => applySearch({ ...search, checkIn: altDates, checkOut: addDays(altDates, nights) })}>
                      Try {new Date(altDates).toLocaleDateString("en-NG", { day: "numeric", month: "short" })} – {new Date(addDays(altDates, nights)).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
                    </Button>
                  )}
                  {(nearbyAreas.length > 0 || (q && rescueCities(properties, q).length > 0)) && (
                    <div className="flex flex-wrap justify-center gap-2">
                      {nearbyAreas.length > 0
                        ? nearbyAreas.map((l) => (
                            <button key={l.id} type="button" onClick={() => applySearch({ ...search, where: l.name, loc: l.slug, locType: l.type } as SearchState)}
                              className="min-h-11 px-3.5 rounded-lg border border-border text-[13px] font-medium">Stays in {l.name}</button>
                          ))
                        : rescueCities(properties, q).map((c) => (
                            <button key={c} type="button" onClick={() => setQ(c)} className="min-h-11 px-3.5 rounded-lg border border-border text-[13px] font-medium">Stays in {c}</button>
                          ))}
                    </div>
                  )}
                  {nFilters > 0 && <button type="button" onClick={() => setFilters({ ...emptyFilters(), sort: filters.sort })} className="text-[15px] font-semibold underline min-h-11">Clear filters</button>}
                  {q && <button type="button" onClick={() => setQ("")} className="text-[13px] font-semibold underline min-h-11">Show all stays</button>}
                </div>
              }
            />
          )}
          {!loading && visible.length > 0 && (
            <div ref={sentinelRef} className="py-6 text-center">
              {loadingMore ? (
                <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" /> Loading more stays…
                </div>
              ) : (moreLocal || hasMore) ? (
                <Button variant="secondary" onClick={showMore}>More stays</Button>
              ) : null}
            </div>
          )}
          </>
        )}
      </main>
    </>
  );
};

export default Explore;
