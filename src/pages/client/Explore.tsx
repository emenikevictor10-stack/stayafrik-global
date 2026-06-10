import { TopBar } from "@/components/shell/TopBar";
import { PropertyCard } from "@/components/property/PropertyCard";
import { CATEGORIES, type Property } from "@/data/properties";
import { Map as MapIcon, List as ListIcon, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { PropertiesMap } from "@/components/map/PropertyMap";
import { useListings } from "@/hooks/useListings";
import { Seo } from "@/components/seo/Seo";
import { SmartSearchBar } from "@/components/search/SmartSearchBar";

// Haversine in km
const distKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

const Explore = () => {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "map">("list");
  const [nearMe, setNearMe] = useState<{ lat: number; lng: number } | null>(null);
  const [selected, setSelected] = useState<Property | null>(null);
  const { data: properties, loading } = useListings();

  const list = useMemo(() => {
    const shortlets = properties.filter((p) => p.type === "Shortlet");
    let out = shortlets.filter((p) => {
      const matchesQ =
        !q ||
        p.title.toLowerCase().includes(q.toLowerCase()) ||
        p.location.toLowerCase().includes(q.toLowerCase());
      return matchesQ;
    });
    if (nearMe) {
      out = out
        .map((p) => ({ p, d: distKm(nearMe, { lat: p.lat, lng: p.lng }) }))
        .sort((a, b) => a.d - b.d)
        .map((x) => x.p);
    }
    return out;
  }, [properties, q, nearMe]);

  return (
    <>
      <Seo
        title="Explore verified shortlets across Africa | Stay"
        description="Search verified shortlets in Lagos, Abuja, Accra, Nairobi, Cape Town and more. Every property independently inspected."
      />
      <TopBar title="Explore" subtitle={`${list.length} verified properties`} />
      <main className="px-5 pt-5 pb-8">
        <SmartSearchBar
          value={q}
          onChange={setQ}
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

        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5 mt-4 pb-1">
          <button
            onClick={() => setFilter(null)}
            className={cn(
              "shrink-0 px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors",
              !filter
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border",
            )}
          >
            ✨ All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.label}
              onClick={() => setFilter(c.filter)}
              className={cn(
                "shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors",
                filter === c.filter
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border",
              )}
            >
              <span>{c.emoji}</span>
              {c.label}
            </button>
          ))}
        </div>

        {/* Platform stats */}
        <section className="mt-5 grid grid-cols-3 gap-2">
          {[
            { n: "5,000+", l: "Verified Listings" },
            { n: "10,000+", l: "Happy Guests" },
            { n: "2,000+", l: "Verified Hosts" },
          ].map((s) => (
            <div key={s.l} className="rounded-2xl bg-card border border-border p-3 text-center">
              <div className="text-primary font-extrabold text-base leading-none">{s.n}</div>
              <div className="text-[10px] text-muted-foreground mt-1 leading-tight">{s.l}</div>
            </div>
          ))}
        </section>

        {/* Trust badges */}
        <section className="mt-3 grid grid-cols-3 gap-2">
          {[
            { e: "✓", t: "Verified Listings", c: "text-success" },
            { e: "🔒", t: "Secure Escrow", c: "text-primary" },
            { e: "💬", t: "24/7 Support", c: "text-primary" },
          ].map((b) => (
            <div key={b.t} className="rounded-2xl bg-card border border-border p-2.5 flex flex-col items-center text-center gap-1">
              <div className={cn("text-base", b.c)}>{b.e}</div>
              <div className="text-[10px] font-semibold leading-tight">{b.t}</div>
            </div>
          ))}
        </section>

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
          <div className="grid grid-cols-1 gap-4 mt-5">
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
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
};

export default Explore;
