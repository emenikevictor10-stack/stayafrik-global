import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Search, List, Rows3, Copy, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Seo } from "@/components/seo/Seo";
import { logAdminAction } from "@/lib/admin-audit";
import { Input } from "@/components/ui/input";

type Row = {
  id: string;
  listing_id: string | null;
  guest_id: string;
  check_in_date: string;
  check_out_date: string;
  total_price: number;
  status: string;
  source: string;
  listing_code: string | null;
  partner_title: string | null;
  partner_city: string | null;
  partner_image: string | null;
  payment_reference: string | null;
  guest_count: number | null;
  attention_reason: string | null;
  rayprop_reservation_id: string | null;
  rayprop_hold_id: string | null;
  released_at: string | null;
  created_at: string;
  listing?: { title: string; host_id: string; city: string | null; images: string[] | null } | null;
};
type Person = { name: string; email: string | null; phone: string | null };
type Refund = { booking_id: string; amount: number; status: string };

const naira = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);
const day = (d: string) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
const nights = (a: string, b: string) => Math.max(0, Math.round((+new Date(b) - +new Date(a)) / 86400000));

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning/15 text-warning",
  confirmed: "bg-primary/15 text-primary",
  completed: "bg-success/15 text-success",
  released: "bg-success/15 text-success",
  cancelled: "bg-muted text-muted-foreground",
  refunded: "bg-destructive/15 text-destructive",
  needs_attention: "bg-warning/15 text-warning",
};
const STATUSES = ["all", "confirmed", "released", "completed", "cancelled", "refunded", "needs_attention"];
const SOURCES = ["all", "local", "rayprop"] as const;

const copy = (v: string) => { navigator.clipboard?.writeText(v); toast.success("Copied"); };

const AdminBookings = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [refunds, setRefunds] = useState<Record<string, Refund>>({});
  const [filter, setFilter] = useState("all");
  const [source, setSource] = useState<(typeof SOURCES)[number]>("all");
  const [view, setView] = useState<"detail" | "compact">("detail");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let query = supabase
      .from("bookings")
      .select("id, listing_id, guest_id, check_in_date, check_out_date, total_price, status, source, listing_code, partner_title, partner_city, partner_image, payment_reference, guest_count, attention_reason, rayprop_reservation_id, rayprop_hold_id, released_at, created_at, listing:listings(title, host_id, city, images)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (filter !== "all") query = query.eq("status", filter);
    const { data, error } = await query;
    if (error) toast.error(error.message);
    const list = ((data as any) || []) as Row[];
    setRows(list);
    const ids = [...new Set(list.flatMap((r) => [r.guest_id, r.listing?.host_id].filter(Boolean) as string[]))];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name, email, phone").in("user_id", ids);
      setPeople(Object.fromEntries((profs || []).map((p: any) => [p.user_id, { name: p.full_name || p.email || "User", email: p.email, phone: p.phone }])));
    }
    if (list.length) {
      const { data: rf } = await supabase.from("refunds").select("booking_id, amount, status").in("booking_id", list.map((r) => r.id));
      setRefunds(Object.fromEntries((rf || []).map((r: any) => [r.booking_id, r])));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const title = (r: Row) => r.listing?.title || r.partner_title || "Listing";

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase().replace(/[·\s]/g, "");
    return rows.filter((r) => {
      if (source === "local" && r.source === "rayprop") return false;
      if (source === "rayprop" && r.source !== "rayprop") return false;
      if (from && r.check_in_date < from) return false;
      if (to && r.check_in_date > to) return false;
      if (!t) return true;
      const g = people[r.guest_id], h = r.listing ? people[r.listing.host_id] : undefined;
      return [
        r.id, r.listing_code, title(r), r.listing?.city, r.partner_city, r.payment_reference,
        r.rayprop_reservation_id, r.rayprop_hold_id, g?.name, g?.email, g?.phone, h?.name, h?.email,
      ].some((v) => (v || "").toLowerCase().replace(/[·\s]/g, "").includes(t));
    });
  }, [rows, q, source, from, to, people]);

  const release = async (r: Row) => {
    if (!confirm(`Release ${naira(Number(r.total_price))} escrow for "${title(r)}" to the host?`)) return;
    const { error } = await supabase.from("bookings").update({ status: "released", released_at: new Date().toISOString() }).eq("id", r.id);
    if (error) return toast.error(error.message);
    await logAdminAction({ action: "booking_released", entityType: "booking", entityId: r.id, metadata: { listing_code: r.listing_code } });
    toast.success("Marked as released");
    load();
  };

  const refund = async (r: Row) => {
    const input = window.prompt(`Refund amount in ₦ (max ${Number(r.total_price)}). This cancels the booking and sends the money back via Paystack.`, String(Number(r.total_price)));
    if (input === null) return;
    const amount = Number(input.replace(/[^\d.]/g, ""));
    if (!Number.isFinite(amount) || amount < 0 || amount > Number(r.total_price)) return toast.error("Invalid amount");
    const { data, error } = await supabase.functions.invoke("cancel-booking", { body: { booking_id: r.id, amount, reason: "Admin refund" } });
    if (error || (data as any)?.error) return toast.error((data as any)?.error || error?.message || "Refund failed");
    await logAdminAction({ action: "booking_refund", entityType: "booking", entityId: r.id, metadata: { amount, listing_code: r.listing_code } });
    toast.success("Refund started");
    load();
  };

  const Actions = ({ r }: { r: Row }) => (
    <div className="flex gap-1">
      {r.status === "confirmed" && r.source !== "rayprop" && (
        <button onClick={() => release(r)} className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-success/40 text-success hover:bg-success/10">Release</button>
      )}
      {r.status === "confirmed" && r.source !== "rayprop" && (
        <button onClick={() => refund(r)} className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10">Refund</button>
      )}
      {r.source === "rayprop" && r.status === "needs_attention" && (
        <Link to="/admin/partner-bookings" className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-warning/40 text-warning hover:bg-warning/10">Resolve</Link>
      )}
    </div>
  );

  const Pill = ({ s }: { s: string }) => (
    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_COLORS[s] || "bg-secondary"}`}>{s.replace("_", " ")}</span>
  );

  return (
    <>
      <Seo title="Bookings | Stay admin" description="Manage bookings and escrow." noindex />
      <header className="mb-4 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold">Bookings</h1>
          <p className="text-sm text-muted-foreground">Local and partner bookings, escrow release and refunds.</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Guest, host, listing ID, title, payment ref…" className="pl-9" />
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex gap-1 flex-wrap">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full capitalize ${filter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
        <select value={source} onChange={(e) => setSource(e.target.value as any)} aria-label="Source"
          className="h-8 rounded-lg bg-secondary border border-border px-2">
          <option value="all">All sources</option><option value="local">Your stays</option><option value="rayprop">Partner stays</option>
        </select>
        <label className="flex items-center gap-1 text-muted-foreground">Check-in from
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 rounded-lg bg-secondary border border-border px-2 text-foreground" />
        </label>
        <label className="flex items-center gap-1 text-muted-foreground">to
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 rounded-lg bg-secondary border border-border px-2 text-foreground" />
        </label>
        {(from || to || source !== "all" || q) && (
          <button onClick={() => { setFrom(""); setTo(""); setSource("all"); setQ(""); }} className="text-primary font-semibold">Clear</button>
        )}
        <div className="ml-auto inline-flex p-1 rounded-lg bg-secondary border border-border">
          {([["detail", List, "Detail"], ["compact", Rows3, "Compact"]] as const).map(([v, Icon, label]) => (
            <button key={v} onClick={() => setView(v)} aria-pressed={view === v}
              className={`px-2.5 py-1 rounded-md font-bold inline-flex items-center gap-1 ${view === v ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>
      </div>
      {!loading && <p className="text-xs text-muted-foreground mb-2">{shown.length} booking{shown.length === 1 ? "" : "s"} · {naira(shown.reduce((s, r) => s + Number(r.total_price), 0))} total</p>}

      {loading ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-secondary animate-pulse" />)}</div>
      ) : shown.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">No bookings match.</div>
      ) : view === "compact" ? (
        <div className="space-y-2">
          {shown.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-3 md:px-4 flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold truncate">{title(r)}</span>
                  {r.listing_code && <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{r.listing_code.replace(/^RP-/, "RP·")}</span>}
                  {r.source === "rayprop" && <span className="text-[10px] font-bold text-primary">Partner</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{people[r.guest_id]?.name || "Guest"} · {day(r.check_in_date)} → {day(r.check_out_date)}</p>
              </div>
              <div className="flex items-center gap-3 justify-between md:justify-end">
                <span className="font-bold text-sm">{naira(Number(r.total_price))}</span>
                <Pill s={r.status} />
                <Actions r={r} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((r) => {
            const g = people[r.guest_id];
            const h = r.listing ? people[r.listing.host_id] : undefined;
            const img = r.listing?.images?.[0] || r.partner_image;
            const rf = refunds[r.id];
            const n = nights(r.check_in_date, r.check_out_date);
            return (
              <article key={r.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="flex flex-col sm:flex-row">
                  <div className="sm:w-40 aspect-[4/3] sm:aspect-auto bg-secondary/40 shrink-0">
                    {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">No photo</div>}
                  </div>
                  <div className="flex-1 p-4 space-y-3 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {r.listing_code && <button onClick={() => copy(r.listing_code!)} className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{r.listing_code.replace(/^RP-/, "RP·")}</button>}
                          <span className={`text-[10px] font-bold ${r.source === "rayprop" ? "text-primary" : "text-muted-foreground"}`}>{r.source === "rayprop" ? "Partner stay" : "Your stay"}</span>
                          <Pill s={r.status} />
                        </div>
                        {r.listing_id ? (
                          <Link to={`/property/${r.listing_id}`} className="font-bold text-base hover:text-primary line-clamp-1">{title(r)}</Link>
                        ) : <p className="font-bold text-base line-clamp-1">{title(r)}</p>}
                        <p className="text-xs text-muted-foreground">{r.listing?.city || r.partner_city || ""}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-extrabold">{naira(Number(r.total_price))}</p>
                        <p className="text-[10px] text-muted-foreground">{n} night{n === 1 ? "" : "s"}{r.guest_count ? ` · ${r.guest_count} guest${r.guest_count === 1 ? "" : "s"}` : ""}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div className="rounded-lg bg-secondary/50 p-2">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Dates</p>
                        <p className="font-semibold">{day(r.check_in_date)} → {day(r.check_out_date)}</p>
                      </div>
                      <div className="rounded-lg bg-secondary/50 p-2 min-w-0">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Guest</p>
                        <Link to={`/admin/users/${r.guest_id}`} className="font-semibold hover:text-primary truncate block">{g?.name || "…"}</Link>
                        <p className="text-muted-foreground truncate">{[g?.email, g?.phone].filter(Boolean).join(" · ")}</p>
                      </div>
                      <div className="rounded-lg bg-secondary/50 p-2 min-w-0">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Host</p>
                        {r.source === "rayprop" ? <p className="font-semibold">RayProp partner</p> : r.listing ? (
                          <>
                            <Link to={`/admin/users/${r.listing.host_id}`} className="font-semibold hover:text-primary truncate block">{h?.name || "…"}</Link>
                            <p className="text-muted-foreground truncate">{[h?.email, h?.phone].filter(Boolean).join(" · ")}</p>
                          </>
                        ) : <p className="text-muted-foreground">Listing deleted</p>}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                      <span>Booked {new Date(r.created_at).toLocaleString()}</span>
                      {r.payment_reference && <button onClick={() => copy(r.payment_reference!)} className="inline-flex items-center gap-1 font-mono hover:text-foreground">Paystack {r.payment_reference}<Copy className="w-3 h-3" /></button>}
                      {r.rayprop_reservation_id && <span className="font-mono">RayProp res. {r.rayprop_reservation_id}</span>}
                      {r.released_at && <span>Released {new Date(r.released_at).toLocaleString()}</span>}
                      {rf && <span className="text-destructive">Refund {naira(Number(rf.amount))} · {rf.status}</span>}
                      <button onClick={() => copy(r.id)} className="font-mono hover:text-foreground">ID {r.id.slice(0, 8)}</button>
                    </div>

                    {r.attention_reason && (
                      <p className="text-xs rounded-lg bg-warning/10 text-warning p-2 flex gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{r.attention_reason}</p>
                    )}

                    <div className="flex justify-end"><Actions r={r} /></div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
};

export default AdminBookings;
