import { useSettings } from "@/hooks/useSettings";
import { ErrorState, ListSkeleton } from "@/ui/kit";
import { toneFor, statusLabel } from "@/lib/status-tone";
import { Tag } from "@/ui/kit";
import { useEffect, useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { Link, useSearchParams } from "react-router-dom";
import { tripTab, type TripTab } from "@/lib/trip-next-step";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ShieldCheck, Clock, CheckCircle2, MapPin, Star } from "lucide-react";
import { toast } from "sonner";
import { guestStatusText, type IssueStatus } from "@/lib/support";

export type BookingRow = {
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
  partner_address: string | null;
  check_in_time: string | null;
  listings: {
    id: string;
    title: string;
    location: string | null;
    city: string | null;
    images: string[];
    address: string | null;
    neighborhood: string | null;
    state: string | null;
  } | null;
};

const HOLD_MIN = 10;
const fmt = (n: number) => "₦" + Math.round(Number(n || 0)).toLocaleString();


export const REVIEW_TAGS = ["Clean", "Great location", "Reliable power", "Good water", "Quiet", "Responsive host", "Value for money", "Safe area"];
export const ReviewForm = ({ booking, onDone }: { booking: BookingRow; onDone: () => void }) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!user || rating < 1) return toast.error("Pick a star rating");
    setBusy(true);
    const { error } = await supabase.from("reviews").insert({
      booking_id: booking.id, listing_id: booking.listing_id, guest_id: user.id, rating, comment: comment.trim().slice(0, 1000) || null, tags,
    });
    setBusy(false);
    if (error) return toast.error(error.code === "23505" ? "You already reviewed this stay" : "Could not save your review");
    toast.success("Thanks for your review!");
    onDone();
  };
  return (
    <div className="mt-3 rounded-xl border border-border p-3 space-y-2">
      <p className="text-xs font-bold">How was your stay?</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" aria-label={`${n} stars`} onClick={() => setRating(n)}>
            <Star className={`w-6 h-6 ${n <= rating ? "fill-primary text-primary" : "text-muted-foreground/40"}`} />
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {REVIEW_TAGS.map((t) => {
          const on = tags.includes(t);
          return <button key={t} type="button" aria-pressed={on} onClick={() => setTags(on ? tags.filter((x) => x !== t) : [...tags, t])}
            className={`min-h-9 px-3 rounded-full border text-xs ${on ? "border-foreground bg-foreground text-background" : "border-border"}`}>{t}</button>;
        })}
      </div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} rows={2} placeholder="Tell other guests about it (optional)"
        className="w-full rounded-lg bg-background border border-border p-2 text-xs" />
      <button onClick={submit} disabled={busy} className="w-full rounded-xl bg-primary text-primary-foreground py-2 text-xs font-bold disabled:opacity-50">Submit review</button>
    </div>
  );
};

const Bookings = () => {
  const { features } = useSettings();
  const { user } = useAuth();
  const [items, setItems] = useState<BookingRow[]>([]);
  const [params, setParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [releasing, setReleasing] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState<Record<string, boolean>>({});
  const [openIssues, setOpenIssues] = useState<Record<string, { id: string; ref: string; status: string }>>({});

  const load = async () => {
    if (!user) return;
    setLoadError(false);
    const { data, error: loadErr } = await supabase
      .from("bookings")
      .select("*, listings(id,title,location,city,images,address,neighborhood,state)")
      .eq("guest_id", user.id)
      .not("status", "in", "(held,expired)") // unpaid holds aren't trips
      .order("created_at", { ascending: false });
    if (loadErr) { setLoadError(true); setLoading(false); return; }
    setItems((data as any) || []);
    const { data: revs } = await supabase.from("reviews").select("booking_id").eq("guest_id", user.id);
    setReviewed(Object.fromEntries((revs || []).map((r) => [r.booking_id, true])));
    const { data: iss } = await supabase.from("support_issues").select("id,ref,status,booking_id").eq("user_id", user.id).neq("status", "closed");
    setOpenIssues(Object.fromEntries((iss || []).map((i) => [i.booking_id, i])));
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const release = async (b: BookingRow) => {
    setReleasing(b.id);
    const { error } = await supabase.rpc("guest_confirm_checkin", { _booking_id: b.id });
    setReleasing(null);
    if (error) return toast.error(error.message);
    toast.success("Funds released to host 🎉");
    load();
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const tabParam = params.get("tab");
  const tab: TripTab = tabParam === "past" || tabParam === "cancelled" ? tabParam : "upcoming";
  const shown = items.filter((b) => tripTab(b.status, b.check_out_date, todayStr) === tab);

  if (loading || loadError) {
    return (
      <>
        <TopBar title="Trips" />
        <main className="px-5 pt-5">{loadError ? <ErrorState message="Your trips didn't load." onRetry={() => { setLoading(true); load(); }} /> : <ListSkeleton rows={3} />}</main>
      </>
    );
  }

  return (
    <>
      <TopBar title="Trips" subtitle={`${items.length} ${items.length === 1 ? "trip" : "trips"}`} />
      <main className="px-5 pt-5 pb-8 space-y-3">
        {items.length > 0 && (
          <div role="tablist" className="flex gap-2">
            {(["upcoming", "past", "cancelled"] as TripTab[]).map((k) => (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => setParams({ tab: k }, { replace: true })}
                className={`min-h-11 px-4 rounded-full border text-[13px] font-semibold ${tab === k ? "border-foreground bg-foreground text-background" : "border-border"}`}>
                {k === "upcoming" ? "Upcoming" : k === "past" ? "Past" : "Cancelled"} ({items.filter((b) => tripTab(b.status, b.check_out_date, todayStr) === k).length})
              </button>
            ))}
          </div>
        )}
        {items.length > 0 && !shown.length && <p className="text-[13px] text-muted-foreground py-6 text-center">Nothing here.</p>}
        {items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <div className="text-3xl mb-1">🧳</div>
            <p className="text-xs text-muted-foreground">No bookings yet.</p>
            <Link to="/explore" className="inline-block mt-3 text-xs font-bold text-primary">Browse stays →</Link>
          </div>
        )}

        {shown.map((b) => {
          const partner = b.source === "rayprop";
          const img = (partner ? b.partner_image : b.listings?.images?.[0]) || "/placeholder.svg";
          const title = (partner ? b.partner_title : b.listings?.title) || "Listing";
          const place = partner ? b.partner_city : b.listings?.location || b.listings?.city;
          const createdMs = new Date(b.created_at).getTime();
          const holdEnds = createdMs + HOLD_MIN * 60_000;
          const canRelease = b.status === "confirmed" && now >= holdEnds;
          const secsLeft = Math.max(0, Math.ceil((holdEnds - now) / 1000));
          const mm = String(Math.floor(secsLeft / 60)).padStart(2, "0");
          const ss = String(secsLeft % 60).padStart(2, "0");

          return (
            <article key={b.id} className="rounded-2xl bg-card border border-border p-3">
              <Link to={`/trips/${b.id}`} className="flex gap-3">
                <img src={img} alt={title} className="w-24 h-24 rounded-xl object-cover" loading="lazy" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{title}</h3>
                  <p className="text-xs text-muted-foreground truncate">📍 {place || "—"}</p>
                  <p className="text-xs mt-2">🗓️ {b.check_in_date} → {b.check_out_date}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <Tag tone={toneFor(b.status)}>{b.status === "needs_attention" ? "Processing" : b.status === "awaiting_host" ? "Paid · waiting for host to accept" : statusLabel(b.status)}</Tag>
                    <span className="text-xs font-extrabold text-primary">{fmt(b.total_price)}</span>
                  </div>
                </div>
              </Link>

              {partner && b.status === "needs_attention" && (
                <p className="mt-3 text-xs text-muted-foreground">Payment received. We're finalising this stay with our partner — you'll be notified shortly.</p>
              )}
              {b.status === "confirmed" && (
                <Link to={`/trips/${b.id}/cancel`} className="mt-3 w-full rounded-xl border border-border py-2.5 text-xs font-bold text-destructive flex items-center justify-center">Cancel booking</Link>
              )}
              {!partner && b.status === "confirmed" && (
                <div className="mt-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-3">
                  <div className="flex items-center gap-2 text-xs text-primary font-bold">
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
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      You can release in <span className="font-mono font-bold text-foreground">{mm}:{ss}</span>. Auto-releases 24h after check-out.
                    </div>
                  )}
                </div>
              )}

              {b.status === "released" && b.released_at && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-success font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Released {new Date(b.released_at).toLocaleString()}
                </div>
              )}

              {["confirmed", "released", "completed"].includes(b.status) && (() => {
                const addr = partner
                  ? b.partner_address
                  : [b.listings?.address, b.listings?.neighborhood, b.listings?.city, b.listings?.state].filter(Boolean).join(", ");
                return (
                  <div className="mt-3 rounded-xl border border-border p-3 text-xs space-y-1">
                    <div className="flex items-start gap-1.5"><MapPin className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                      <span><span className="font-bold">Address:</span> {addr || "Will be sent before check-in"}</span></div>
                    {addr && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`} target="_blank" rel="noreferrer" className="text-primary font-bold">Get directions →</a>}
                    <p className="text-muted-foreground">Check-in {b.check_in_date}{b.check_in_time ? ` from ${b.check_in_time}` : partner ? "" : " from 2:00 PM"} · Ref <span className="font-mono">{b.payment_reference}</span></p>
                  </div>
                );
              })()}

              {openIssues[b.id] ? (
                <Link to={`/issues/${openIssues[b.id].id}`} className="mt-3 flex items-center justify-between w-full h-11 px-3 rounded-lg border border-warning/40 bg-orange/10 text-[13px]">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange" aria-hidden />Problem {openIssues[b.id].ref} · {guestStatusText[openIssues[b.id].status as IssueStatus]}</span>
                  <span className="font-semibold">Open</span>
                </Link>
              ) : features.report_problem && ["confirmed", "released", "completed", "needs_attention"].includes(b.status) && (
                <Link to={`/trips/${b.id}/report`} className="mt-3 flex items-center justify-center w-full h-11 rounded-lg border border-border text-[13px] font-semibold">
                  Report a problem
                </Link>
              )}

              {!partner && ["confirmed", "released", "completed"].includes(b.status) && b.check_out_date <= new Date().toISOString().slice(0, 10) && (
                reviewed[b.id]
                  ? <p className="mt-3 text-xs text-success font-semibold">✓ Thanks for your review</p>
                  : <ReviewForm booking={b} onDone={() => setReviewed((r) => ({ ...r, [b.id]: true }))} />
              )}
            </article>
          );
        })}
      </main>
    </>
  );
};

export default Bookings;
