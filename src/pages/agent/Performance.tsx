import { TopBar } from "@/components/shell/TopBar";
import { ChevronLeft, MessageSquare, CheckCircle2, DollarSign, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMyListings } from "@/hooks/useListings";
import { supabase } from "@/integrations/supabase/client";

const formatN = (n: number) =>
  n >= 1_000_000 ? `₦${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `₦${Math.round(n / 1000)}k` : `₦${n}`;

const Performance = () => {
  const { user } = useAuth();
  const { data: myListings } = useMyListings(user?.id);
  const [stats, setStats] = useState({ leads: 0, closed: 0, avgDeal: 0, reviews: 0, rating: 0 });

  useEffect(() => {
    if (!user || !myListings.length) return;
    const ids = myListings.map((l) => l.id);
    (async () => {
      const [{ data: bookings }, { data: messages }, { data: reviews }] = await Promise.all([
        supabase.from("bookings").select("status,total_price").in("listing_id", ids),
        supabase.from("messages").select("id").in("listing_id", ids),
        supabase.from("reviews").select("rating").in("listing_id", ids),
      ]);
      const closedRows = (bookings || []).filter((b: any) => ["confirmed", "released"].includes(b.status));
      const closedTotal = closedRows.reduce((a: number, b: any) => a + Number(b.total_price || 0), 0);
      const ratings = (reviews || []).map((r: any) => Number(r.rating || 0));
      setStats({
        leads: messages?.length || 0,
        closed: closedRows.length,
        avgDeal: closedRows.length ? Math.round(closedTotal / closedRows.length) : 0,
        reviews: reviews?.length || 0,
        rating: ratings.length ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)) : 0,
      });
    })();
  }, [user, myListings]);

  const kpis = [
    { Icon: MessageSquare, l: "Leads", v: String(stats.leads) },
    { Icon: CheckCircle2, l: "Closed bookings", v: String(stats.closed) },
    { Icon: DollarSign, l: "Avg booking", v: formatN(stats.avgDeal) },
    { Icon: Star, l: "Avg rating", v: stats.rating ? String(stats.rating) : "—" },
  ];

  return (
    <>
      <TopBar title="Performance" subtitle="Live numbers across your listings" />
      <main className="px-5 pt-4 pb-8">
        <Link
          to="/profile"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Back to profile
        </Link>

        <section className="grid grid-cols-2 gap-3">
          {kpis.map((k) => (
            <div key={k.l} className="rounded-2xl bg-card border border-border p-4">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
                <k.Icon className="w-4 h-4 text-primary" />
              </div>
              <div className="text-xl font-extrabold mt-3">{k.v}</div>
              <div className="text-xs text-muted-foreground">{k.l}</div>
            </div>
          ))}
        </section>

        <section className="mt-5 rounded-2xl bg-card border border-border p-4">
          <h3 className="text-sm font-bold mb-3">Your listings</h3>
          {myListings.length === 0 ? (
            <p className="text-xs text-muted-foreground">No listings yet — your performance metrics will appear once you publish your first property.</p>
          ) : (
            <div className="space-y-2.5">
              {myListings.map((l) => (
                <Link key={l.id} to={`/listings/${l.id}/edit`} className="flex items-center gap-3 hover:opacity-80">
                  <img src={l.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{l.title}</div>
                    <div className="text-xs text-muted-foreground">{l.verified ? "Live" : "Pending review"} · ⭐ {l.rating || "—"} ({l.reviews})</div>
                  </div>
                  <div className="text-xs font-bold text-primary">{l.price}</div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
};

export default Performance;
