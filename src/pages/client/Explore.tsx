import { TopBar } from "@/components/shell/TopBar";
import { PropertyCard } from "@/components/property/PropertyCard";
import { CATEGORIES } from "@/data/properties";
import { Search, Map as MapIcon, List as ListIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { PropertiesMap } from "@/components/map/PropertyMap";
import { useListings } from "@/hooks/useListings";

const Explore = () => {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "map">("list");
  const { data: properties, loading } = useListings();
  const list = properties.filter((p) => {
    const matchesQ =
      !q ||
      p.title.toLowerCase().includes(q.toLowerCase()) ||
      p.location.toLowerCase().includes(q.toLowerCase());
    const matchesF = !filter || p.type === filter;
    return matchesQ && matchesF;
  });

  return (
    <>
      <TopBar title="Explore" subtitle={`${list.length} verified properties`} />
      <main className="px-5 pt-5 pb-8">
        <div className="flex items-center gap-3 px-4 py-3 rounded-full bg-card border border-border focus-within:border-primary">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search city, area or property…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            onClick={() => setView(view === "list" ? "map" : "list")}
            className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-primary"
            aria-label="Toggle map view"
          >
            {view === "list" ? <><MapIcon className="w-4 h-4" /> Map</> : <><ListIcon className="w-4 h-4" /> List</>}
          </button>
        </div>

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

        {view === "map" ? (
          <div className="mt-5">
            <PropertiesMap list={list} height={520} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 mt-5">
            {list.map((p) => (
              <PropertyCard key={p.id} p={p} />
            ))}
            {list.length === 0 && (
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
