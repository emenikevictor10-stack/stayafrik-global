import { TopBar } from "@/components/shell/TopBar";
import { PropertyCard } from "@/components/property/PropertyCard";
import { type Property } from "@/data/properties";
import { Map as MapIcon, List as ListIcon, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { PropertiesMap } from "@/components/map/PropertyMap";
import { useListings } from "@/hooks/useListings";
import { Seo } from "@/components/seo/Seo";
import { SmartSearchBar } from "@/components/search/SmartSearchBar";
import { searchProperties, buildLocationIndex } from "@/lib/location-search";

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

const SMART_FILTERS: { key: SmartFilter; label: string; emoji: string; hint: string }[] = [
  { key: "budget", label: "Budget friendly", emoji: "💸", hint: "Under ₦100k / night" },
  { key: "toprated", label: "Top rated", emoji: "⭐", hint: "4.5+ rating" },
  { key: "family", label: "Family size", emoji: "👨‍👩‍👧", hint: "3+ bedrooms" },
  { key: "power", label: "Never dark", emoji: "🔌", hint: "Generator / inverter" },
  { key: "workstay", label: "Work stay", emoji: "💻", hint: "Fast Wi-Fi" },
  { key: "luxury", label: "Luxury", emoji: "💎", hint: "Premium homes" },
];

const hasAmenity = (p: Property, words: string[]) =>
  p.amenities.some((a) => words.some((w) => a.label.toLowerCase().includes(w)));

const matchesSmart = (p: Property, f: SmartFilter) => {
  switch (f) {
    case "budget": return p.priceNum > 0 && p.priceNum <= 100000;
    case "toprated": return p.rating >= 4.5;
    case "family": return p.beds >= 3;
    case "power": return hasAmenity(p, ["generator", "inverter", "solar", "power"]);
    case "workstay": return hasAmenity(p, ["wi-fi", "wifi", "internet"]);
    case "luxury": return p.priceNum >= 200000 || hasAmenity(p, ["pool", "gym"]);
  }
};

const Explore = () => {
  const [q, setQ] = useState("");
  const [smart, setSmart] = useState<SmartFilter[]>([]);
  const [view, setView] = useState<"list" | "map">("list");
  const [nearMe, setNearMe] = useState<{ lat: number; lng: number } | null>(null);
  const [selected, setSelected] = useState<Property | null>(null);
  const { data: properties, loading } = useListings();

  const toggleSmart = (k: SmartFilter) =>
    setSmart((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

  const places = useMemo(() => buildLocationIndex(properties), [properties]);

  const { list, fallbackCity } = useMemo(() => {
    const shortlets = properties.filter((p) => p.type === "Shortlet");
    const { results, fallbackCity } = searchProperties(shortlets, q);
    let out = results.filter((p) => smart.every((f) => matchesSmart(p, f)));
    if (smart.includes("budget")) out = [...out].sort((a, b) => a.priceNum - b.priceNum);
    else if (smart.includes("toprated")) out = [...out].sort((a, b) => b.rating - a.rating);
    if (nearMe) {
      out = out
        .map((p) => ({ p, d: distKm(nearMe, { lat: p.lat, lng: p.lng }) }))
        .sort((a, b) => a.d - b.d)
        .map((x) => x.p);
    }
    return { list: out, fallbackCity };
  }, [properties, q, smart, nearMe]);


  return (
    <>
      <Seo
        title="Explore verified shortlets in Nigeria | Stay"
        description="Search verified shortlets in Lagos, Abuja, Port Harcourt and more. Book partner and local stays securely."
      />
      <TopBar title="Explore" subtitle={`${list.length} verified properties`} />
      <main className="px-5 pt-5 pb-8">
        <SmartSearchBar
          value={q}
          onChange={setQ}
          places={places}
          onLocate={(c) => {
            setNearMe(c);
            setView("map");
          }}
          rightSlot={
            <button
              onClick={() => setView(view === "list" ? "map" : "list")}
              className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-primary px-2 py-1 rounded-full hover:bg-primary/10"
              aria-label="Toggle map view"
            >
              {view === "list" ? <><MapIcon className="w-3.5 h-3.5" /><span className="hidden sm:inline">Map</span></> : <><ListIcon className="w-3.5 h-3.5" /><span className="hidden sm:inline">List</span></>}
            </button>
          }
        />

        {nearMe && (
          <button
            type="button"
            onClick={() => setNearMe(null)}
            className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary px-2.5 py-1 rounded-full bg-primary/10 border border-primary/30"
          >
            📍 Sorted by distance · clear <X className="w-3 h-3" />
          </button>
        )}

        {/* AI-optimised quick filters */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5 mt-4 pb-1">
          <button
            onClick={() => setSmart([])}
            className={cn(
              "shrink-0 px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors",
              smart.length === 0
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border",
            )}
          >
            ✨ All
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
              <span>{f.emoji}</span>
              {f.label}
            </button>
          ))}
        </div>
        {q.trim() && !loading && (
          <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>
              {fallbackCity
                ? `No exact match for "${q}" — showing other ${fallbackCity} stays`
                : `${list.length} ${list.length === 1 ? "stay" : "stays"} for "${q}"`}
            </span>
            <button type="button" onClick={() => setQ("")} className="font-semibold text-primary underline">Clear search</button>
          </div>
        )}
        {smart.length > 0 && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            {SMART_FILTERS.filter((f) => smart.includes(f.key)).map((f) => f.hint).join(" · ")}
          </p>
        )}


        {view === "map" ? (
          <div className="mt-5 relative">
            <PropertiesMap list={list} height={520} onSelect={setSelected} />
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
                    <div className="text-[11px] text-muted-foreground truncate">📍 {selected.location}</div>
                    <div className="text-primary font-extrabold text-sm mt-0.5">{selected.price} <span className="text-[10px] font-medium text-muted-foreground">/night</span></div>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    aria-label="Close"
                    className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <Link
                    to={`/property/${selected.id}`}
                    className="text-xs font-bold bg-primary text-primary-foreground px-3 py-2 rounded-full"
                  >
                    View
                  </Link>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
            {loading && (
              <div className="text-center py-16 text-muted-foreground text-sm">
                <div className="w-6 h-6 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin mb-2" />
                Loading properties…
              </div>
            )}
            {!loading && list.map((p) => (
              <PropertyCard key={p.id} p={p} />
            ))}
            {!loading && list.length === 0 && (
              <div className="text-center py-16 text-muted-foreground text-sm">
                <div className="text-4xl mb-2">🔍</div>
                No properties match your search.
                {q && (
                  <div>
                    <button type="button" onClick={() => setQ("")} className="mt-3 text-xs font-semibold text-primary underline">Show all stays</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
};

export default Explore;
