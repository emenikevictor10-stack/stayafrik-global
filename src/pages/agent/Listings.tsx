import { Tag } from "@/ui/kit";
import { TopBar } from "@/components/shell/TopBar";
import { Link } from "react-router-dom";
import { Plus, Eye, MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { useMyListings } from "@/hooks/useListings";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const Listings = () => {
  const { user } = useAuth();
  const { data: properties, loading } = useMyListings(user?.id);
  const [leadCounts, setLeadCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!properties.length) return;
    const ids = properties.map((p) => p.id);
    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("listing_id")
        .in("listing_id", ids);
      const counts: Record<string, number> = {};
      (data || []).forEach((m: any) => {
        if (m.listing_id) counts[m.listing_id] = (counts[m.listing_id] || 0) + 1;
      });
      setLeadCounts(counts);
    })();
  }, [properties]);

  return (
    <>
      <TopBar title="Listings" />
      <main className="px-5 pt-5 pb-8">
        <Link
          to="/listings/new"
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground py-3.5 font-bold text-sm shadow-glow active:scale-[0.99]"
        >
          <Plus className="w-4 h-4" />
          List a new property
        </Link>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[
            { l: "Live", v: properties.filter((p) => p.verified).length, c: "text-success" },
            { l: "In review", v: properties.filter((p) => !p.verified).length, c: "text-primary" },
            { l: "Total", v: properties.length, c: "text-muted-foreground" },
          ].map((s) => (
            <div key={s.l} className="rounded-xl bg-card border border-border py-3">
              <div className={`text-lg font-extrabold ${s.c}`}>{s.v}</div>
              <div className="text-xs text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 space-y-3">
          {loading && (
            <div className="text-center py-10 text-muted-foreground text-sm">
              <div className="w-6 h-6 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin mb-2" />
              Loading listings…
            </div>
          )}
          {!loading && properties.length === 0 && (
            <div className="text-center py-10 text-muted-foreground text-sm">
              <div className="text-3xl mb-2">📭</div>
              No listings yet.
            </div>
          )}
          {properties.map((p) => (
            <Link
              key={p.id}
              to={`/listings/${p.id}/edit`}
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
                  {p.verified ? (
                    <Tag tone="done" className="shrink-0">Live</Tag>
                  ) : (
                    <Tag tone="act" className="shrink-0">Pending review</Tag>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">📍 {p.location}</p>
                <div className="text-primary font-extrabold text-sm mt-1.5">{p.price}</div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {leadCounts[p.id] || 0} leads</span>
                  <span className="inline-flex items-center gap-1"><Eye className="w-3 h-3" /> {p.reviews} reviews</span>
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
