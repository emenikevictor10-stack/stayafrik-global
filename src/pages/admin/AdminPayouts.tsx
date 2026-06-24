import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Seo } from "@/components/seo/Seo";
import { logAdminAction } from "@/lib/admin-audit";

type Row = {
  id: string;
  host_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  processed_at: string | null;
  booking_id: string | null;
  failure_reason: string | null;
};

const formatMoney = (n: number, cur = "NGN") =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning/15 text-warning",
  processing: "bg-primary/15 text-primary",
  paid: "bg-success/15 text-success",
  failed: "bg-destructive/15 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

const AdminPayouts = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("payouts" as any)
      .select("id, host_id, amount, currency, status, created_at, processed_at, booking_id, failure_reason")
      .order("created_at", { ascending: false })
      .limit(200);
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setRows(((data as any) || []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const mark = async (id: string, status: string) => {
    const patch: any = { status };
    if (status === "paid") { patch.processed_at = new Date().toISOString(); }
    const { error } = await supabase.from("payouts" as any).update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    await logAdminAction({ action: `payout_${status}`, entityType: "payout", entityId: id });
    toast.success(`Payout ${status}`);
    load();
  };

  const processPayout = async (id: string) => {
    const t = toast.loading("Initiating Paystack transfer…");
    const { data, error } = await supabase.functions.invoke("process-payout", { body: { payout_id: id } });
    toast.dismiss(t);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Transfer failed");
    } else {
      toast.success("Transfer queued at Paystack");
    }
    load();
  };

  const totalDue = rows.filter((r) => r.status === "pending").reduce((s, r) => s + Number(r.amount), 0);

  return (
    <>
      <Seo title="Payouts | Stay admin" description="Process host settlements." noindex />
      <header className="mb-5 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold">Payouts</h1>
          <p className="text-sm text-muted-foreground">{formatMoney(totalDue)} pending across {rows.filter((r) => r.status === "pending").length} payouts</p>
        </div>
        <div className="flex gap-1 flex-wrap">
          {["all", "pending", "processing", "paid", "failed"].map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`text-xs font-semibold px-3 py-1.5 rounded-full ${filter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{s}</button>
          ))}
        </div>
      </header>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2.5">Host</th>
              <th className="text-left px-4 py-2.5">Amount</th>
              <th className="text-left px-4 py-2.5">Status</th>
              <th className="text-left px-4 py-2.5">Created</th>
              <th className="text-right px-4 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No payouts in queue</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-2.5 font-mono text-xs">{r.host_id.slice(0, 8)}…</td>
                <td className="px-4 py-2.5 font-bold">{formatMoney(Number(r.amount), r.currency)}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status] || "bg-secondary"}`}>{r.status}</span>
                  {r.failure_reason && <p className="text-[10px] text-destructive mt-0.5">{r.failure_reason}</p>}
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-2.5 text-right space-x-1">
                  {r.status === "pending" && (
                    <>
                      <button onClick={() => processPayout(r.id)} className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">Send via Paystack</button>
                      <button onClick={() => mark(r.id, "paid")} className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-success/40 text-success hover:bg-success/10">Mark paid</button>
                      <button onClick={() => mark(r.id, "cancelled")} className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-border text-muted-foreground hover:bg-secondary">Cancel</button>
                    </>
                  )}
                  {r.status === "processing" && (
                    <button onClick={() => mark(r.id, "paid")} className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-success/40 text-success hover:bg-success/10">Mark paid</button>
                  )}
                  {r.status === "failed" && (
                    <button onClick={() => mark(r.id, "pending")} className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-border text-muted-foreground hover:bg-secondary">Retry</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Tip: Hook this up to Paystack Transfers in an edge function. The button can flip status to <em>processing</em>, trigger the transfer, and a webhook can mark it <em>paid</em> or <em>failed</em>.
      </p>
    </>
  );
};

export default AdminPayouts;
