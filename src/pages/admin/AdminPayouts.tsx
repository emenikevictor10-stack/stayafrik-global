import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Search, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Seo } from "@/components/seo/Seo";
import { Input } from "@/components/ui/input";
import { logAdminAction } from "@/lib/admin-audit";

type Row = {
  id: string; host_id: string; amount: number; currency: string; status: string; created_at: string;
  processed_at: string | null; booking_id: string | null; failure_reason: string | null; paystack_transfer_code: string | null;
  booking?: { listing_code: string | null; check_in_date: string; check_out_date: string; total_price: number; listing: { title: string } | null } | null;
};
type Person = { name: string; email: string | null; phone: string | null; bank: string | null };

const money = (n: number, cur = "NGN") =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning/15 text-warning", processing: "bg-primary/15 text-primary",
  paid: "bg-success/15 text-success", failed: "bg-destructive/15 text-destructive", cancelled: "bg-muted text-muted-foreground",
};

const AdminPayouts = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let query = supabase.from("payouts")
      .select("id, host_id, amount, currency, status, created_at, processed_at, booking_id, failure_reason, paystack_transfer_code, booking:bookings(listing_code, check_in_date, check_out_date, total_price, listing:listings(title))")
      .order("created_at", { ascending: false }).limit(500);
    if (filter !== "all") query = query.eq("status", filter);
    const { data, error } = await query;
    if (error) toast.error(error.message);
    const list = ((data as any) || []) as Row[];
    setRows(list);
    const ids = [...new Set(list.map((r) => r.host_id))];
    if (ids.length) {
      const [{ data: profs }, { data: pms }] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, email, phone").in("user_id", ids),
        supabase.from("payment_methods").select("user_id, brand, last4, is_default").in("user_id", ids).eq("is_default", true),
      ]);
      const bank = new Map((pms || []).map((p: any) => [p.user_id, `${p.brand} ••${p.last4}`]));
      setPeople(Object.fromEntries((profs || []).map((p: any) => [p.user_id, {
        name: p.full_name || p.email || "Host", email: p.email, phone: p.phone, bank: bank.get(p.user_id) || null,
      }])));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const mark = async (r: Row, status: string) => {
    if (!confirm(`Mark ${money(Number(r.amount))} payout to ${people[r.host_id]?.name || "host"} as ${status}?`)) return;
    const patch: any = { status };
    if (status === "paid") patch.processed_at = new Date().toISOString();
    if (status === "pending") patch.failure_reason = null;
    const { error } = await supabase.from("payouts").update(patch).eq("id", r.id);
    if (error) return toast.error(error.message);
    await logAdminAction({ action: `payout_${status}`, entityType: "payout", entityId: r.id, metadata: { amount: r.amount, listing_code: r.booking?.listing_code } });
    toast.success(`Payout ${status}`);
    load();
  };

  const send = async (r: Row) => {
    if (!people[r.host_id]?.bank) return toast.error("This host has no default bank account yet");
    if (!confirm(`Send ${money(Number(r.amount))} to ${people[r.host_id]?.name} (${people[r.host_id]?.bank}) via Paystack?`)) return;
    const t = toast.loading("Starting Paystack transfer…");
    const { data, error } = await supabase.functions.invoke("process-payout", { body: { payout_id: r.id } });
    toast.dismiss(t);
    if (error || (data as any)?.error) toast.error((data as any)?.error || error?.message || "Transfer failed");
    else toast.success("Transfer queued at Paystack");
    load();
  };

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase().replace(/[·\s]/g, "");
    if (!t) return rows;
    return rows.filter((r) => {
      const h = people[r.host_id];
      return [r.id, r.booking_id, r.paystack_transfer_code, r.booking?.listing_code, r.booking?.listing?.title, h?.name, h?.email, h?.phone]
        .some((v) => (v || "").toLowerCase().replace(/[·\s]/g, "").includes(t));
    });
  }, [rows, q, people]);

  const pending = rows.filter((r) => r.status === "pending");

  return (
    <>
      <Seo title="Payouts | Stay admin" description="Process host settlements." noindex />
      <header className="mb-4 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold">Payouts</h1>
          <p className="text-sm text-muted-foreground">{money(pending.reduce((s, r) => s + Number(r.amount), 0))} pending across {pending.length} payout{pending.length === 1 ? "" : "s"}. Created automatically when a booking's escrow is released.</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Host, listing ID, title, transfer code…" className="pl-9" />
        </div>
      </header>
      <div className="flex gap-1 flex-wrap mb-4">
        {["all", "pending", "processing", "paid", "failed", "cancelled"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`text-xs font-semibold px-3 py-1.5 rounded-full capitalize ${filter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{s}</button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-xl bg-secondary animate-pulse" />)}</div>
      ) : shown.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">{rows.length ? "No payouts match." : "No payouts yet."}</div>
      ) : (
        <div className="space-y-3">
          {shown.map((r) => {
            const h = people[r.host_id];
            return (
              <article key={r.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {r.booking?.listing_code && <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{r.booking.listing_code}</span>}
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status] || "bg-secondary"}`}>{r.status}</span>
                    </div>
                    <p className="font-bold">{r.booking?.listing?.title || (r.booking_id ? "Booking" : "Manual payout")}</p>
                    {r.booking && <p className="text-xs text-muted-foreground">Stay {r.booking.check_in_date} → {r.booking.check_out_date} · guest paid {money(Number(r.booking.total_price))}</p>}
                  </div>
                  <p className="text-xl font-extrabold">{money(Number(r.amount), r.currency)}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-secondary/50 p-2 min-w-0">
                    <p className="text-xs font-bold text-muted-foreground">Host</p>
                    <Link to={`/admin/users/${r.host_id}`} className="font-semibold hover:text-primary truncate block">{h?.name || "…"}</Link>
                    <p className="text-muted-foreground truncate">{[h?.email, h?.phone].filter(Boolean).join(" · ")}</p>
                  </div>
                  <div className="rounded-lg bg-secondary/50 p-2">
                    <p className="text-xs font-bold text-muted-foreground">Bank account</p>
                    {h?.bank ? <p className="font-semibold">{h.bank}</p> : <p className="text-warning font-semibold">Not added yet</p>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Created {new Date(r.created_at).toLocaleString()}</span>
                  {r.processed_at && <span>Paid {new Date(r.processed_at).toLocaleString()}</span>}
                  {r.paystack_transfer_code && <span className="font-mono">Transfer {r.paystack_transfer_code}</span>}
                </div>
                {r.failure_reason && <p className="text-xs rounded-lg bg-destructive/10 text-destructive p-2 flex gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{r.failure_reason}</p>}
                <div className="flex justify-end gap-1.5 flex-wrap">
                  {r.status === "pending" && (
                    <>
                      <button onClick={() => mark(r, "cancelled")} className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-border text-muted-foreground hover:bg-secondary">Cancel</button>
                      <button onClick={() => mark(r, "paid")} className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-success/40 text-success hover:bg-success/10">Mark paid (sent outside app)</button>
                      <button onClick={() => send(r)} className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">Send via Paystack</button>
                    </>
                  )}
                  {r.status === "processing" && (
                    <button onClick={() => mark(r, "paid")} className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-success/40 text-success hover:bg-success/10">Mark paid</button>
                  )}
                  {r.status === "failed" && (
                    <button onClick={() => mark(r, "pending")} className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-border hover:bg-secondary">Move back to pending</button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
};

export default AdminPayouts;
