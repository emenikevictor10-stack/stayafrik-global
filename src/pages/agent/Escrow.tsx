import { useEffect, useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ShieldCheck, Lock, CheckCircle2, Clock } from "lucide-react";

type Row = {
  id: string;
  guest_id: string;
  check_in_date: string;
  check_out_date: string;
  total_price: number;
  status: string;
  created_at: string;
  released_at: string | null;
  listings: { id: string; title: string; images: string[] } | null;
};

const fmt = (n: number) => "₦" + Math.round(Number(n || 0)).toLocaleString();

const Escrow = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // RLS already allows hosts to see bookings for their own listings
      const { data } = await supabase
        .from("bookings")
        .select("*, listings!inner(id,title,images,host_id)")
        .eq("listings.host_id", user.id)
        .order("created_at", { ascending: false });
      setRows((data as any) || []);
      setLoading(false);
    })();
  }, [user?.id]);

  const held = rows.filter((r) => r.status === "confirmed");
  const released = rows.filter((r) => r.status === "released");
  const totalHeld = held.reduce((s, r) => s + Number(r.total_price || 0), 0);
  const totalReleased = released.reduce((s, r) => s + Number(r.total_price || 0), 0);

  return (
    <>
      <TopBar title="Escrow" subtitle="Funds you've received" />
      <main className="px-5 pt-4 pb-8 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 p-4">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase"><Lock className="w-3 h-3" /> Held</div>
            <div className="text-xl font-extrabold mt-1">{fmt(totalHeld)}</div>
            <div className="text-[10px] text-muted-foreground">{held.length} booking{held.length !== 1 ? "s" : ""}</div>
          </div>
          <div className="rounded-2xl bg-card border border-border p-4">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-success uppercase"><CheckCircle2 className="w-3 h-3" /> Released</div>
            <div className="text-xl font-extrabold mt-1">{fmt(totalReleased)}</div>
            <div className="text-[10px] text-muted-foreground">{released.length} payout{released.length !== 1 ? "s" : ""}</div>
          </div>
        </div>

        {loading && <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}

        {!loading && rows.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <ShieldCheck className="w-8 h-8 text-primary mx-auto" />
            <p className="text-xs text-muted-foreground mt-2">No escrowed bookings yet.</p>
          </div>
        )}

        {rows.map((r) => {
          const img = r.listings?.images?.[0] || "/placeholder.svg";
          const isHeld = r.status === "confirmed";
          return (
            <article key={r.id} className="rounded-2xl bg-card border border-border p-4">
              <div className="flex gap-3">
                <img src={img} alt={r.listings?.title || "Listing"} className="w-14 h-14 rounded-xl object-cover" loading="lazy" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{r.listings?.title || "Listing"}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{r.check_in_date} → {r.check_out_date}</p>
                </div>
                <div className="text-primary font-extrabold text-sm shrink-0">{fmt(r.total_price)}</div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border ${
                  isHeld ? "bg-primary/15 text-primary border-primary/30" : "bg-success/15 text-success border-success/30"
                }`}>
                  {isHeld ? <><Clock className="w-3 h-3" /> Awaiting client release</> : <><CheckCircle2 className="w-3 h-3" /> Released</>}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {isHeld ? `Booked ${new Date(r.created_at).toLocaleDateString()}` : r.released_at ? `Paid ${new Date(r.released_at).toLocaleDateString()}` : ""}
                </span>
              </div>
            </article>
          );
        })}
      </main>
    </>
  );
};

export default Escrow;
