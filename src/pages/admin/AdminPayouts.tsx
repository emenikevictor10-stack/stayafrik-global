import { payoutNextStep } from "@/lib/next-step";
import { ErrorState, NextStep, Tabs, Tag } from "@/ui/kit";
import { toneFor, statusLabel } from "@/lib/status-tone";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Search, AlertTriangle, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Seo } from "@/components/seo/Seo";
import { Input } from "@/components/ui/input";
import { useSettings } from "@/hooks/useSettings";
import { PAYOUT_TABS, payoutBlockReason, payoutsCsv } from "@/lib/payout-rules";

type Row = {
  id: string; host_id: string; amount: number; currency: string; status: string; created_at: string; due_at: string | null;
  processed_at: string | null; booking_id: string | null; failure_reason: string | null; paystack_transfer_code: string | null;
  hold_reason: string | null; paid_reference: string | null;
  booking?: { listing_code: string | null; check_in_date: string; check_out_date: string; total_price: number; listing: { title: string } | null } | null;
};
type Person = { name: string; email: string | null; phone: string | null; bank: string | null; block: string | null };

const money = (n: number, cur = "NGN") =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);

const AdminPayouts = () => {
  const { features } = useSettings();
  const idRequired = features.id_required;
  const [rows, setRows] = useState<Row[]>([]);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [filter, setFilter] = useState("due");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = async () => {
    setLoading(true);
    const statuses = PAYOUT_TABS.find((t) => t.value === filter)!.statuses;
    const { data, error } = await supabase.from("payouts")
      .select("id, host_id, amount, currency, status, created_at, due_at, processed_at, booking_id, failure_reason, paystack_transfer_code, hold_reason, paid_reference, booking:bookings(listing_code, check_in_date, check_out_date, total_price, listing:listings(title))")
      .in("status", statuses).order("created_at", { ascending: false }).limit(500);
    setLoadError(!!error);
    if (error) toast.error(error.message);
    const list = ((data as any) || []) as Row[];
    setRows(list);
    const ids = [...new Set(list.map((r) => r.host_id))];
    if (ids.length) {
      const [{ data: profs }, { data: pms }, { data: hs }, { data: kyc }] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, email, phone").in("user_id", ids),
        supabase.from("payment_methods").select("user_id, brand, last4, account_number, verified_at").in("user_id", ids).eq("is_default", true),
        supabase.from("host_status").select("host_id, status").in("host_id", ids),
        supabase.from("kyc_submissions").select("user_id").in("user_id", ids).eq("status", "approved"),
      ]);
      const pm = new Map((pms || []).map((p: any) => [p.user_id, p]));
      const susp = new Set((hs || []).filter((h: any) => h.status === "suspended").map((h: any) => h.host_id));
      const idOk = new Set((kyc || []).map((k: any) => k.user_id));
      setPeople(Object.fromEntries((profs || []).map((p: any) => {
        const b: any = pm.get(p.user_id);
        return [p.user_id, {
          name: p.full_name || p.email || "Host", email: p.email, phone: p.phone,
          bank: b ? `${b.brand} ••${b.last4}${b.verified_at ? " · checked" : ""}` : null,
          block: payoutBlockReason({ suspended: susp.has(p.user_id), hasBank: !!b?.account_number, bankVerified: !!b?.verified_at, idRequired, idApproved: idOk.has(p.user_id) }),
        }];
      })));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter, idRequired]);

  const act = async (r: Row, action: string) => {
    let reason: string | null = null, reference: string | null = null;
    const who = people[r.host_id]?.name || "host";
    if (action === "hold" || action === "cancel") {
      reason = window.prompt(`${action === "hold" ? "Hold" : "Cancel"} ${money(Number(r.amount))} for ${who}. Reason (required):`);
      if (!reason?.trim()) return;
    } else if (action === "mark_paid") {
      reference = window.prompt(`Mark ${money(Number(r.amount))} to ${who} as paid. Transfer reference (required):`);
      if (!reference?.trim()) return;
    } else if (!confirm(`${action === "release_hold" ? "Release hold on" : "Retry"} this payout?`)) return;
    const { error } = await supabase.rpc("staff_payout_action" as any, { _payout_id: r.id, _action: action, _reason: reason, _reference: reference });
    if (error) return toast.error(error.message);
    toast.success("Saved");
    load();
  };

  const send = async (r: Row) => {
    const h = people[r.host_id];
    if (h?.block) return toast.error(h.block);
    if (!confirm(`Send ${money(Number(r.amount))} to ${h?.name} (${h?.bank}) via Paystack?`)) return;
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
      return [r.id, r.booking_id, r.paystack_transfer_code, r.paid_reference, r.booking?.listing_code, r.booking?.listing?.title, h?.name, h?.email, h?.phone]
        .some((v) => (v || "").toLowerCase().replace(/[·\s]/g, "").includes(t));
    });
  }, [rows, q, people]);

  const downloadCsv = () => {
    const csv = payoutsCsv(shown.map((r) => ({
      id: r.id, status: r.status, amount: Number(r.amount), host: people[r.host_id]?.name || "", email: people[r.host_id]?.email || null,
      bank: people[r.host_id]?.bank || null, listing_code: r.booking?.listing_code || null, check_in: r.booking?.check_in_date || null,
      due_at: r.due_at, paid_reference: r.paid_reference, hold_reason: r.hold_reason,
    })));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `payouts-${filter}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const total = shown.reduce((s, r) => s + Number(r.amount), 0);
  const btn = "text-xs font-semibold px-2.5 py-1 rounded-lg border border-border hover:bg-secondary";

  return (
    <>
      <Seo title="Payouts | Stay admin" description="Process host settlements." noindex />
      <header className="mb-4 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold">Payouts</h1>
          <p className="text-sm text-muted-foreground">{money(total)} across {shown.length} payout{shown.length === 1 ? "" : "s"}. A payout is due the day after the guest checks in.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Host, listing ID, reference…" className="pl-9" />
          </div>
          <button onClick={downloadCsv} disabled={!shown.length} className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 rounded-lg border border-border hover:bg-secondary disabled:opacity-50 min-h-11"><Download className="w-4 h-4" />CSV</button>
        </div>
      </header>
      <div className="w-full mb-4"><Tabs value={filter} onChange={setFilter} tabs={PAYOUT_TABS.map(({ value, label }) => ({ value, label }))} /></div>

      {loadError ? <ErrorState message="This list didn't load." onRetry={() => load()} /> : loading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-xl bg-secondary animate-pulse" />)}</div>
      ) : shown.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">{rows.length ? "No payouts match." : "Nothing here."}</div>
      ) : (
        <div className="space-y-3">
          {shown.map((r) => {
            const h = people[r.host_id];
            const ns = payoutNextStep({ status: r.status, amount: Number(r.amount), host: h?.name?.split(" ")[0] });
            return (
              <article key={r.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
                <NextStep tone={ns.tone} status={ns.status} sentence={r.status === "pending" && h?.block ? `Can't pay yet: ${h.block}.` : ns.sentence} />
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {r.booking?.listing_code && <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{r.booking.listing_code}</span>}
                      <Tag tone={toneFor(r.status)}>{r.status === "pending" ? "Due" : statusLabel(r.status)}</Tag>
                    </div>
                    <p className="font-bold">{r.booking?.listing?.title || (r.booking_id ? "Booking" : "Manual payout")}</p>
                    {r.booking && <p className="text-xs text-muted-foreground">Stay {r.booking.check_in_date} → {r.booking.check_out_date} · guest paid {money(Number(r.booking.total_price))}</p>}
                  </div>
                  <p className="text-xl font-extrabold">{money(Number(r.amount), r.currency)}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-secondary/50 p-2 min-w-0">
                    <p className="text-xs font-bold text-muted-foreground">Host</p>
                    <Link to={`/admin/hosts?q=${encodeURIComponent(h?.email || r.host_id)}`} className="font-semibold hover:text-primary truncate block">{h?.name || "…"}</Link>
                    <p className="text-muted-foreground truncate">{[h?.email, h?.phone].filter(Boolean).join(" · ")}</p>
                  </div>
                  <div className="rounded-lg bg-secondary/50 p-2">
                    <p className="text-xs font-bold text-muted-foreground">Bank account</p>
                    {h?.bank ? <p className="font-semibold">{h.bank}</p> : <p className="text-warning font-semibold">Not added yet</p>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {r.due_at && <span>Due {new Date(r.due_at).toLocaleDateString()}</span>}
                  {r.processed_at && <span>Paid {new Date(r.processed_at).toLocaleString()}</span>}
                  {r.paid_reference && <span className="font-mono">Ref {r.paid_reference}</span>}
                  {r.paystack_transfer_code && <span className="font-mono">Transfer {r.paystack_transfer_code}</span>}
                </div>
                {r.hold_reason && <p className="text-xs rounded-lg bg-secondary p-2">On hold: {r.hold_reason}</p>}
                {r.failure_reason && <p className="text-xs rounded-lg bg-destructive/10 text-destructive p-2 flex gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{r.failure_reason}</p>}
                <div className="flex justify-end gap-1.5 flex-wrap">
                  {r.status === "pending" && (<>
                    <button onClick={() => act(r, "cancel")} className={btn}>Cancel</button>
                    <button onClick={() => act(r, "hold")} className={btn}>Hold</button>
                    <button onClick={() => act(r, "mark_paid")} disabled={!!h?.block} className={`${btn} disabled:opacity-50`}>Mark paid</button>
                    <button onClick={() => send(r)} disabled={!!h?.block} className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">Send via Paystack</button>
                  </>)}
                  {r.status === "processing" && <button onClick={() => act(r, "mark_paid")} className={btn}>Mark paid</button>}
                  {r.status === "on_hold" && (<>
                    <button onClick={() => act(r, "cancel")} className={btn}>Cancel</button>
                    <button onClick={() => act(r, "release_hold")} className={btn}>Release hold</button>
                  </>)}
                  {r.status === "failed" && (<>
                    <button onClick={() => act(r, "hold")} className={btn}>Hold</button>
                    <button onClick={() => act(r, "retry")} className={btn}>Move back to due</button>
                  </>)}
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
