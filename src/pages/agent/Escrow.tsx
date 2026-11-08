import { useEffect, useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
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
  host_respond_by: string | null;
  listings: { id: string; title: string; images: string[] } | null;
};

const fmt = (n: number) => "₦" + Math.round(Number(n || 0)).toLocaleString();

const Escrow = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const [busy, setBusy] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const answer = async (id: string, action: "accept" | "decline") => {
    if (action === "decline" && !confirm("Decline this request? The guest gets a full refund.")) return;
    setBusy(id);
    const { data, error } = await supabase.functions.invoke("booking-requests", { body: { booking_id: id, action } });
    setBusy(null);
    if (error || (data as any)?.error) return toast.error((data as any)?.error || "Couldn't save. Try again.");
    toast.success(action === "accept" ? "Booking confirmed" : "Request declined — guest refunded");
    setTick((t) => t + 1);
  };

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
  }, [user?.id, tick]);

  const requests = rows.filter((r) => r.status === "awaiting_host");
  const held = rows.filter((r) => r.status === "confirmed");
  const released = rows.filter((r) => r.status === "released");
  const totalHeld = held.reduce((s, r) => s + Number(r.total_price || 0), 0);
  const totalReleased = released.reduce((s, r) => s + Number(r.total_price || 0), 0);

  return (
    <>
      <TopBar title="Escrow" subtitle="Funds you've received" />
      <main className="px-5 pt-4 pb-8 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 p-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary"><Lock className="w-3 h-3" /> Held</div>
            <div className="text-xl font-extrabold mt-1">{fmt(totalHeld)}</div>
            <div className="text-xs text-muted-foreground">{held.length} booking{held.length !== 1 ? "s" : ""}</div>
          </div>
          <div className="rounded-2xl bg-card border border-border p-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-success"><CheckCircle2 className="w-3 h-3" /> Released</div>
            <div className="text-xl font-extrabold mt-1">{fmt(totalReleased)}</div>
            <div className="text-xs text-muted-foreground">{released.length} payout{released.length !== 1 ? "s" : ""}</div>
          </div>
        </div>

        {requests.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-bold">Booking requests ({requests.length})</h2>
            {requests.map((r) => (
              <article key={r.id} className="rounded-2xl bg-card border border-primary/40 p-4 space-y-3">
                <div className="flex justify-between gap-3 text-sm">
                  <div className="min-w-0"><p className="font-semibold truncate">{r.listings?.title}</p>
                    <p className="text-xs text-muted-foreground">{r.check_in_date} → {r.check_out_date} · paid {fmt(r.total_price)}</p>
                    {r.host_respond_by && <p className="text-xs text-muted-foreground">Reply by {new Date(r.host_respond_by).toLocaleString()}</p>}</div>
                </div>
                <div className="flex gap-2">
                  <button disabled={busy === r.id} onClick={() => answer(r.id, "accept")} className="flex-1 min-h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold">Accept</button>
                  <button disabled={busy === r.id} onClick={() => answer(r.id, "decline")} className="flex-1 min-h-11 rounded-xl border border-border text-sm font-bold">Decline</button>
                </div>
              </article>
            ))}
          </section>
        )}

        {loading && <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}

        {!loading && rows.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <ShieldCheck className="w-8 h-8 text-primary mx-auto" />
            <p className="text-xs text-muted-foreground mt-2">No escrowed bookings yet.</p>
          </div>
        )}

        {rows.filter((r) => r.status !== "awaiting_host").map((r) => {
          const img = r.listings?.images?.[0] || "/placeholder.svg";
          const isHeld = r.status === "confirmed";
          return (
            <article key={r.id} className="rounded-2xl bg-card border border-border p-4">
              <div className="flex gap-3">
                <img src={img} alt={r.listings?.title || "Listing"} className="w-14 h-14 rounded-xl object-cover" loading="lazy" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{r.listings?.title || "Listing"}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.check_in_date} → {r.check_out_date}</p>
                </div>
                <div className="text-primary font-extrabold text-sm shrink-0">{fmt(r.total_price)}</div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full border ${
                  isHeld ? "bg-primary/15 text-primary border-primary/30" : "bg-success/15 text-success border-success/30"
                }`}>
                  {isHeld ? <><Clock className="w-3 h-3" /> Awaiting client release</> : <><CheckCircle2 className="w-3 h-3" /> Released</>}
                </span>
                <span className="text-xs text-muted-foreground">
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
