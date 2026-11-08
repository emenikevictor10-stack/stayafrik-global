import { TopBar } from "@/components/shell/TopBar";
import { ChevronLeft, ArrowDownToLine, Banknote } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMyListings } from "@/hooks/useListings";
import { supabase } from "@/integrations/supabase/client";

type BookingRow = { id: string; total_price: number; status: string; created_at: string; listing_id: string };

const fmt = (n: number) => "₦" + Math.round(n).toLocaleString();

const Commission = () => {
  const { user } = useAuth();
  const { data: myListings } = useMyListings(user?.id);
  const [bookings, setBookings] = useState<BookingRow[]>([]);

  useEffect(() => {
    if (!user || !myListings.length) return;
    const ids = myListings.map((l) => l.id);
    supabase
      .from("bookings")
      .select("id,total_price,status,created_at,listing_id")
      .in("listing_id", ids)
      .order("created_at", { ascending: false })
      .then(({ data }) => setBookings((data as BookingRow[]) || []));
  }, [user, myListings]);

  const titleOf = (lid: string) => myListings.find((l) => l.id === lid)?.title || "Booking";

  const released = bookings.filter((b) => b.status === "released");
  const pending = bookings.filter((b) => ["pending", "confirmed"].includes(b.status));
  const availableBalance = released.reduce((a, b) => a + Number(b.total_price || 0) * 0.97, 0);
  const pendingTotal = pending.reduce((a, b) => a + Number(b.total_price || 0) * 0.97, 0);

  // last 6 months grouped totals
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString(undefined, { month: "short" }), total: 0 };
  });
  bookings.forEach((b) => {
    const d = new Date(b.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const m = months.find((x) => x.key === key);
    if (m) m.total += Number(b.total_price || 0) * 0.97;
  });
  const max = Math.max(1, ...months.map((m) => m.total));

  return (
    <>
      <TopBar title="Commission & payouts" subtitle="Earnings at a glance" />
      <main className="px-5 pt-4 pb-8">
        <Link to="/profile" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3">
          <ChevronLeft className="w-3.5 h-3.5" /> Back to profile
        </Link>

        <section className="relative rounded-3xl bg-gradient-to-br from-primary/30 via-primary/10 to-card border border-primary/30 p-5 overflow-hidden">
          <div className="absolute inset-0 bg-grid opacity-30" />
          <div className="relative">
            <div className="text-xs text-muted-foreground">Available balance</div>
            <div className="mt-1 text-4xl font-extrabold tracking-tight">{fmt(availableBalance)}</div>
            <div className="text-xs text-muted-foreground mt-1">{fmt(pendingTotal)} pending release</div>
            <button
              onClick={() => toast.success(availableBalance > 0 ? "Withdrawal queued — funds arrive within 24h" : "No funds to withdraw yet")}
              disabled={availableBalance <= 0}
              className="mt-4 w-full rounded-2xl bg-primary text-primary-foreground py-3 font-bold text-sm flex items-center justify-center gap-2 shadow-glow disabled:opacity-50"
            >
              <ArrowDownToLine className="w-4 h-4" /> Withdraw to bank
            </button>
          </div>
        </section>

        <section className="mt-4 rounded-2xl bg-card border border-border p-4">
          <h3 className="text-sm font-bold mb-4">6-month earnings</h3>
          <div className="flex items-end gap-2 h-32">
            {months.map((m) => (
              <div key={m.key} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full rounded-t-md bg-primary/70" style={{ height: `${(m.total / max) * 100}%` }} />
                <div className="text-xs text-muted-foreground">{m.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-2xl bg-card border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold">Recent payouts</h3>
            <Link to="/profile/payouts" className="text-xs text-primary font-bold inline-flex items-center gap-1">
              <Banknote className="w-3 h-3" /> Bank
            </Link>
          </div>
          {bookings.length === 0 ? (
            <p className="text-xs text-muted-foreground">No bookings yet — payouts appear here once guests check out.</p>
          ) : (
            <div className="space-y-2.5">
              {bookings.slice(0, 8).map((b) => (
                <div key={b.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{titleOf(b.listing_id)}</div>
                    <div className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold">{fmt(Number(b.total_price) * 0.97)}</div>
                    <div className={`text-xs font-bold ${b.status === "released" ? "text-success" : "text-primary"}`}>{b.status}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
};

export default Commission;
