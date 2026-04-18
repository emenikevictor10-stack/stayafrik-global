import { TopBar } from "@/components/shell/TopBar";
import { PropertyCard } from "@/components/property/PropertyCard";
import { PROPERTIES, CITIES, CATEGORIES } from "@/data/properties";
import { Search } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const ClientHome = () => {
  const [cat, setCat] = useState<string>("Shortlet");
  const featured = PROPERTIES.filter((p) => p.type === cat).slice(0, 6);

  return (
    <>
      <TopBar title="​" subtitle="\n" />
      <main className="px-5 pt-5 pb-8">
        {/* Search */}
        <Link
          to="/explore"
          className="flex items-center gap-3 px-4 py-3.5 rounded-full bg-card border border-border hover:border-primary/50 transition-colors"
        >
          <Search className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground flex-1">Where to next?</span>
          <span className="text-base">🔎</span>
        </Link>

        {/* Hero */}
        <section className="mt-6 rounded-2xl bg-card border border-border p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-grid opacity-30" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 border border-success/30 text-[10px] font-semibold text-success">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              0 fraud cases on platform
            </span>
            <h2 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight">
              Africa's <span className="text-primary">verified</span> property platform.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Every shortlet, home and plot is independently checked. Pay safely through PropertyEscrow™.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { n: "2.4k+", l: "Verified stays" },
                { n: "₦184B", l: "Escrow vol." },
                { n: "98%", l: "Satisfaction" },
              ].map((s) => (
                <div key={s.l} className="rounded-xl bg-secondary p-3">
                  <div className="text-primary font-extrabold text-base leading-none">{s.n}</div>
                  <div className="text-[10px] text-muted-foreground mt-1 leading-tight">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="mt-6">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-1">
            {CATEGORIES.map((c) => (
              <button
                key={c.label}
                onClick={() => setCat(c.filter)}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors",
                  cat === c.filter
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:text-foreground",
                )}
              >
                <span aria-hidden>{c.emoji}</span>
                {c.label}
              </button>
            ))}
          </div>
        </section>

        {/* Cities */}
        <section className="mt-6">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-base font-bold">Top cities</h2>
            <Link to="/explore" className="text-xs text-primary font-semibold">
              View all →
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-5 px-5">
            {CITIES.map((c) => (
              <button
                key={c.name}
                className="shrink-0 w-24 rounded-2xl bg-card border border-border p-3 text-left hover:border-primary/50 transition-colors"
              >
                <div className="text-2xl">{c.emoji}</div>
                <div className="text-xs font-semibold mt-2">{c.name}</div>
                <div className="text-[10px] text-muted-foreground">{c.count} stays</div>
              </button>
            ))}
          </div>
        </section>

        {/* Featured */}
        <section className="mt-7">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-base font-bold">Featured · {cat}</h2>
            <Link to="/explore" className="text-xs text-primary font-semibold">
              See all →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {featured.map((p) => (
              <PropertyCard key={p.id} p={p} />
            ))}
          </div>
        </section>

        {/* Trust pillars */}
        <section className="mt-8 grid gap-3">
          {[
            { e: "🛡️", t: "PropertyVerify™", s: "Title verified at the State Land Registry before listing." },
            { e: "🔐", t: "PropertyEscrow™", s: "Funds released only when you confirm receipt of documents." },
            { e: "🤝", t: "Verified Agents", s: "ID-checked agents with transparent commission." },
          ].map((p) => (
            <div key={p.t} className="rounded-2xl bg-card border border-border p-4 flex gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-xl shrink-0">
                {p.e}
              </div>
              <div>
                <h3 className="font-bold text-sm">{p.t}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{p.s}</p>
              </div>
            </div>
          ))}
        </section>
      </main>
    </>
  );
};
