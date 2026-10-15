import { useEffect, useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ShieldCheck, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cancelRayPropBooking } from "@/lib/rayprop";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

type BookingRow = {
  id: string;
  listing_id: string;
  check_in_date: string;
  check_out_date: string;
  total_price: number;
  status: string;
  created_at: string;
  released_at: string | null;
  payment_reference: string | null;
  source: string;
  partner_title: string | null;
  partner_image: string | null;
  partner_city: string | null;
  rayprop_listing_id: string | null;
  listings: {
    id: string;
    title: string;
    location: string | null;
    city: string | null;
    images: string[];
  } | null;
};

const HOLD_MIN = 10;
const fmt = (n: number) => "₦" + Math.round(Number(n || 0)).toLocaleString();

const statusBadge = (s: string) =>
  s === "released"
    ? "bg-success/15 text-success border-success/30"
    : s === "confirmed"
    ? "bg-primary/15 text-primary border-primary/30"
    : "bg-muted text-muted-foreground border-border";

const Bookings = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [releasing, setReleasing] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("bookings")
      .select("*, listings(id,title,location,city,images)")
      .eq("guest_id", user.id)
      .order("created_at", { ascending: false });
    setItems((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const release = async (b: BookingRow) => {
    setReleasing(b.id);
    const { error } = await supabase
      .from("bookings")
      .update({ status: "released", released_at: new Date().toISOString() })
      .eq("id", b.id);
    setReleasing(null);
    if (error) return toast.error(error.message);
    toast.success("Funds released to host 🎉");
    load();
  };

  const cancelPartner = async (b: BookingRow) => {
    setReleasing(b.id);
    try {
      await cancelRayPropBooking(b.id);
      toast.success("Booking cancelled. Any refund follows the partner's policy.");
      load();
    } catch (e: any) { toast.error(e.message || "Could not cancel"); }
    setReleasing(null);
  };

  if (loading) {
    return (
      <>
        <TopBar title="My bookings" />
        <main className="px-5 pt-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></main>
      </>
    );
  }

  return (
    <>
      <TopBar title="My bookings" subtitle={`${items.length} ${items.length === 1 ? "trip" : "trips"}`} />
      <main className="px-5 pt-5 pb-8 space-y-3">
        {items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <div className="text-3xl mb-1">🧳</div>
            <p className="text-xs text-muted-foreground">No bookings yet.</p>
            <Link to="/explore" className="inline-block mt-3 text-xs font-bold text-primary">Browse stays →</Link>
          </div>
        )}

        {items.map((b) => {
          const partner = b.source === "rayprop";
          const img = (partner ? b.partner_image : b.listings?.images?.[0]) || "/placeholder.svg";
          const title = (partner ? b.partner_title : b.listings?.title) || "Listing";
          const place = partner ? b.partner_city : b.listings?.location || b.listings?.city;
          const href = partner ? `/property/rp_${b.rayprop_listing_id}` : `/property/${b.listing_id}`;
          const createdMs = new Date(b.created_at).getTime();
          const holdEnds = createdMs + HOLD_MIN * 60_000;
          const canRelease = b.status === "confirmed" && now >= holdEnds;
          const secsLeft = Math.max(0, Math.ceil((holdEnds - now) / 1000));
          const mm = String(Math.floor(secsLeft / 60)).padStart(2, "0");
          const ss = String(secsLeft % 60).padStart(2, "0");

          return (
            <article key={b.id} className="rounded-2xl bg-card border border-border p-3">
              <Link to={href} className="flex gap-3">
                <img src={img} alt={title} className="w-24 h-24 rounded-xl object-cover" loading="lazy" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{title}</h3>
                  <p className="text-[11px] text-muted-foreground truncate">📍 {place || "—"}</p>
                  <p className="text-xs mt-2">🗓️ {b.check_in_date} → {b.check_out_date}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full border capitalize ${statusBadge(b.status)}`}>{b.status === "needs_attention" ? "processing" : b.status}</span>
                    <span className="text-xs font-extrabold text-primary">{fmt(b.total_price)}</span>
                  </div>
                </div>
              </Link>

              {partner && b.status === "needs_attention" && (
                <p className="mt-3 text-[11px] text-muted-foreground">Payment received. We're finalising this stay with our partner — you'll be notified shortly.</p>
              )}
              {partner && b.status === "confirmed" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button disabled={releasing === b.id} className="mt-3 w-full rounded-xl border border-border py-2.5 text-xs font-bold text-destructive disabled:opacity-50">Cancel booking</button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel this stay?</AlertDialogTitle>
                      <AlertDialogDescription>Refunds follow the partner's policy: a full refund if you cancel 48 hours or more before check-in, and a partial or no refund closer to the date.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep booking</AlertDialogCancel>
                      <AlertDialogAction onClick={() => cancelPartner(b)}>Cancel stay</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              {!partner && b.status === "confirmed" && (
                <div className="mt-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-3">
                  <div className="flex items-center gap-2 text-[11px] text-primary font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" /> Funds held in escrow
                  </div>
                  {canRelease ? (
                    <button
                      onClick={() => release(b)}
                      disabled={releasing === b.id}
                      className="mt-2 w-full rounded-xl bg-primary text-primary-foreground py-2.5 font-bold text-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {releasing === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Approve & release to host
                    </button>
                  ) : (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      You can release in <span className="font-mono font-bold text-foreground">{mm}:{ss}</span>. Auto-releases 24h after check-out.
                    </div>
                  )}
                </div>
              )}

              {b.status === "released" && b.released_at && (
                <div className="mt-3 flex items-center gap-1.5 text-[11px] text-success font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Released {new Date(b.released_at).toLocaleString()}
                </div>
              )}
            </article>
          );
        })}
      </main>
    </>
  );
};

export default Bookings;
