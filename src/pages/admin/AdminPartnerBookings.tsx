import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, RefreshCw, Wallet, Webhook, Search, Copy, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Seo } from "@/components/seo/Seo";
import { Input } from "@/components/ui/input";
import { raypropRegisterWebhook, raypropRetry, raypropWallet, refreshRayPropStatus } from "@/lib/rayprop";
import { koboToNaira } from "@/lib/rayprop-map";

type Row = {
  id: string; guest_id: string; check_in_date: string; check_out_date: string; total_price: number; status: string; created_at: string;
  partner_title: string | null; partner_city: string | null; partner_image: string | null; listing_code: string | null;
  rayprop_listing_id: string | null; rayprop_quote_id: string | null; rayprop_hold_id: string | null; rayprop_reservation_id: string | null;
  rayprop_quote_total_kobo: number | null; guest_count: number | null; payment_reference: string | null; attention_reason: string | null;
};
type Person = { name: string; email: string | null; phone: string | null };

const naira = (n: number) => "₦" + Math.round(Number(n || 0)).toLocaleString();
const day = (d: string) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
const LOW_BALANCE_NAIRA = 200_000;
const STATUSES = ["all", "needs_attention", "confirmed", "completed", "cancelled", "refunded"];
const COLORS: Record<string, string> = {
  confirmed: "bg-primary/15 text-primary", completed: "bg-success/15 text-success",
  cancelled: "bg-muted text-muted-foreground", refunded: "bg-destructive/15 text-destructive",
  needs_attention: "bg-warning/15 text-warning",
};
const copy = (v: string) => { navigator.clipboard?.writeText(v); toast.success("Copied"); };

const AdminPartnerBookings = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<{ balance: number; disabled?: boolean } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("bookings")
      .select("id,guest_id,check_in_date,check_out_date,total_price,status,created_at,partner_title,partner_city,partner_image,listing_code,rayprop_listing_id,rayprop_quote_id,rayprop_hold_id,rayprop_reservation_id,rayprop_quote_total_kobo,guest_count,payment_reference,attention_reason")
      .eq("source", "rayprop").order("created_at", { ascending: false }).limit(500);
    if (error) toast.error(error.message);
    const list = (data as Row[]) || [];
    setRows(list);
    const ids = [...new Set(list.map((r) => r.guest_id))];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name, email, phone").in("user_id", ids);
      setPeople(Object.fromEntries((profs || []).map((p: any) => [p.user_id, { name: p.full_name || p.email || "Guest", email: p.email, phone: p.phone }])));
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    raypropWallet().then((w) => setWallet(w ? { balance: koboToNaira(w.balance) } : { balance: 0, disabled: true })).catch(() => setWallet(null));
  }, []);

  const run = async (id: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(id);
    try { await fn(); toast.success(ok); await load(); } catch (e: any) { toast.error(e.message || "Failed"); }
    setBusy(null);
  };

  const attention = rows.filter((r) => r.status === "needs_attention");
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase().replace(/[·\s]/g, "");
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (from && r.check_in_date < from) return false;
      if (to && r.check_in_date > to) return false;
      if (!t) return true;
      const g = people[r.guest_id];
      return [r.id, r.partner_title, r.partner_city, r.listing_code, r.rayprop_listing_id, r.rayprop_reservation_id, r.rayprop_hold_id,
        r.rayprop_quote_id, r.payment_reference, g?.name, g?.email, g?.phone]
        .some((v) => (v || "").toLowerCase().replace(/[·\s]/g, "").includes(t));
    });
  }, [rows, filter, q, from, to, people]);

  return (
    <>
      <Seo title="Partner bookings | Stay admin" description="RayProp partner reservations." noindex />
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold">Partner bookings</h1>
            <p className="text-sm text-muted-foreground">Stays booked through RayProp.</p>
          </div>
          <button onClick={() => run("webhook", raypropRegisterWebhook, "Webhook registered with RayProp")} disabled={busy === "webhook"}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 h-9 text-xs font-bold disabled:opacity-50">
            {busy === "webhook" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Webhook className="w-3.5 h-3.5" />} Register webhook
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-2xl bg-card border border-border p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Wallet className="w-4 h-4" /> RayProp wallet</div>
            <div className="mt-1 text-2xl font-extrabold">{wallet ? (wallet.disabled ? "Not connected" : naira(wallet.balance)) : "—"}</div>
            {wallet && !wallet.disabled && wallet.balance < LOW_BALANCE_NAIRA && (
              <p className="mt-1 text-xs text-destructive font-semibold">Low balance — top up so partner bookings can be confirmed.</p>
            )}
          </div>
          <button onClick={() => setFilter("needs_attention")} className="text-left rounded-2xl bg-card border border-border p-4">
            <div className="text-xs text-muted-foreground">Needs attention</div>
            <div className={`mt-1 text-2xl font-extrabold ${attention.length ? "text-destructive" : ""}`}>{attention.length}</div>
            <p className="text-xs text-muted-foreground">Paid by the guest, not yet confirmed by RayProp. Retry or refund.</p>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Guest, title, RayProp ID, payment ref…" className="pl-9" />
          </div>
          <label className="flex items-center gap-1 text-xs text-muted-foreground">Check-in from
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 rounded-lg bg-secondary border border-border px-2 text-foreground" />
          </label>
          <label className="flex items-center gap-1 text-xs text-muted-foreground">to
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 rounded-lg bg-secondary border border-border px-2 text-foreground" />
          </label>
        </div>
        <div className="flex gap-1 flex-wrap">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full capitalize ${filter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
              {s.replace("_", " ")}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-28 rounded-xl bg-secondary animate-pulse" />)}</div>
        ) : shown.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">{rows.length ? "No partner bookings match." : "No partner bookings yet."}</div>
        ) : (
          <div className="space-y-3">
            {shown.map((r) => {
              const g = people[r.guest_id];
              return (
                <article key={r.id} className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col sm:flex-row">
                  <div className="sm:w-40 aspect-[4/3] sm:aspect-auto bg-secondary/40 shrink-0">
                    {r.partner_image ? <img src={r.partner_image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No photo</div>}
                  </div>
                  <div className="flex-1 p-4 space-y-3 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {r.listing_code && <button onClick={() => copy(r.listing_code!)} className="font-mono text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{r.listing_code.replace(/^RP-/, "RP·")}</button>}
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${COLORS[r.status] || "bg-secondary"}`}>{r.status.replace("_", " ")}</span>
                        </div>
                        {r.rayprop_listing_id
                          ? <Link to={`/property/rp_${r.rayprop_listing_id}`} className="font-bold text-base hover:text-primary line-clamp-1">{r.partner_title || "Partner stay"}</Link>
                          : <p className="font-bold text-base line-clamp-1">{r.partner_title || "Partner stay"}</p>}
                        <p className="text-xs text-muted-foreground">{r.partner_city}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-extrabold">{naira(r.total_price)}</p>
                        {r.rayprop_quote_total_kobo != null && <p className="text-xs text-muted-foreground">RayProp quote {naira(koboToNaira(r.rayprop_quote_total_kobo))}</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-secondary/50 p-2">
                        <p className="text-xs font-bold text-muted-foreground">Dates</p>
                        <p className="font-semibold">{day(r.check_in_date)} → {day(r.check_out_date)}{r.guest_count ? ` · ${r.guest_count} guest${r.guest_count === 1 ? "" : "s"}` : ""}</p>
                      </div>
                      <div className="rounded-lg bg-secondary/50 p-2 min-w-0">
                        <p className="text-xs font-bold text-muted-foreground">Guest</p>
                        <Link to={`/admin/users/${r.guest_id}`} className="font-semibold hover:text-primary truncate block">{g?.name || "…"}</Link>
                        <p className="text-muted-foreground truncate">{[g?.email, g?.phone].filter(Boolean).join(" · ")}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground font-mono">
                      <span className="font-sans">Booked {new Date(r.created_at).toLocaleString()}</span>
                      <span>Reservation {r.rayprop_reservation_id || "—"}</span>
                      {r.rayprop_hold_id && <span>Hold {r.rayprop_hold_id}</span>}
                      {r.payment_reference && <button onClick={() => copy(r.payment_reference!)} className="inline-flex items-center gap-1 hover:text-foreground">Paystack {r.payment_reference}<Copy className="w-3 h-3" /></button>}
                    </div>
                    {r.attention_reason && (
                      <p className="text-xs rounded-lg bg-warning/10 text-warning p-2 flex gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{r.attention_reason}</p>
                    )}
                    <div className="flex justify-end gap-2">
                      {r.status === "needs_attention" ? (
                        <button onClick={() => run(r.id, () => raypropRetry(r.id), "Retried")} disabled={busy === r.id}
                          className="rounded-full bg-primary text-primary-foreground px-4 h-8 text-xs font-bold disabled:opacity-50">{busy === r.id ? "Retrying…" : "Retry with RayProp"}</button>
                      ) : r.rayprop_reservation_id ? (
                        <button onClick={() => run(r.id, () => refreshRayPropStatus(r.id), "Status refreshed")} disabled={busy === r.id}
                          className="rounded-full border border-border px-3 h-8 text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"><RefreshCw className="w-3.5 h-3.5" /> Refresh status</button>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default AdminPartnerBookings;
