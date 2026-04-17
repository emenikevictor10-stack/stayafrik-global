import { TopBar } from "@/components/shell/TopBar";
import { PROPERTIES } from "@/data/properties";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const Listings = () => {
  return (
    <>
      <TopBar title="My listings" subtitle={`${PROPERTIES.length} properties · all verified`} />
      <main className="px-5 pt-5 pb-8">
        <button
          onClick={() => toast.success("New listing flow coming next")}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground py-3.5 font-bold text-sm shadow-glow active:scale-[0.99]"
        >
          <Plus className="w-4 h-4" />
          List a new property
        </button>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[
            { l: "Live", v: "9", c: "text-success" },
            { l: "In review", v: "2", c: "text-primary" },
            { l: "Drafts", v: "1", c: "text-muted-foreground" },
          ].map((s) => (
            <div key={s.l} className="rounded-xl bg-card border border-border py-3">
              <div className={`text-lg font-extrabold ${s.c}`}>{s.v}</div>
              <div className="text-[10px] text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 space-y-3">
          {PROPERTIES.map((p, i) => (
            <Link
              key={p.id}
              to={`/property/${p.id}`}
              className="flex gap-3 rounded-2xl bg-card border border-border p-3 hover:border-primary/50"
            >
              <img
                src={p.image}
                alt={p.title}
                width={120}
                height={120}
                loading="lazy"
                className="w-20 h-20 rounded-xl object-cover"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm truncate">{p.title}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/30 shrink-0">
                    ✓ Live
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">📍 {p.location}</p>
                <div className="text-primary font-extrabold text-sm mt-1.5">{p.price}</div>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                  <span>👁️ {1200 - i * 80}</span>
                  <span>📩 {30 - i * 4} leads</span>
                  <span>🔐 {i % 2 === 0 ? "1 in escrow" : "—"}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
};

export default Listings;
