import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button, EmptyState, ErrorState, ListSkeleton, Notice, Tabs, Tag } from "@/ui/kit";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { transferState, type TransferRow } from "@/lib/bank-transfer";

type Row = TransferRow & { id: string; guest_id: string; source: string; reference: string; title: string | null; check_in: string | null; check_out: string | null; sender_name: string | null; receipt_path: string | null; reject_reason: string | null; submitted_at: string | null; created_at: string; meta: any };
type TabKey = "waiting" | "approved" | "rejected";

const fmt = (k: number) => "₦" + Math.round(k / 100).toLocaleString();
const input = "h-11 rounded-lg border border-border bg-background px-3 text-[13px]";

const AdminBankTransfers = () => {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [names, setNames] = useState<Record<string, { full_name: string | null; email: string | null }>>({});
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [err, setErr] = useState(false);
  const [tab, setTab] = useState<TabKey>("waiting");
  const [q, setQ] = useState("");
  const [view, setView] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ row: Row; action: "approve" | "reject" } | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setErr(false);
    const { data, error } = await (supabase as any).from("bank_transfers").select("*").order("created_at", { ascending: false }).limit(300);
    if (error) return setErr(true);
    const list = (data || []) as Row[];
    setRows(list);
    const ids = [...new Set(list.map((r) => r.guest_id))];
    if (ids.length) {
      const { data: p } = await supabase.from("profiles").select("user_id,full_name,email").in("user_id", ids);
      setNames(Object.fromEntries((p || []).map((x) => [x.user_id, x])));
    }
    const paths = list.map((r) => r.receipt_path).filter(Boolean) as string[];
    if (paths.length) {
      const { data: s } = await supabase.storage.from("transfer-receipts").createSignedUrls(paths, 3600);
      setUrls(Object.fromEntries((s || []).filter((x) => x.signedUrl).map((x) => [x.path!, x.signedUrl])));
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const shown = useMemo(() => (rows || []).filter((r) => {
    const st = transferState(r);
    const inTab = tab === "waiting" ? st === "submitted" || st === "awaiting_proof" : tab === "approved" ? st === "approved" : st === "rejected" || st === "expired";
    const n = names[r.guest_id];
    return inTab && (!q || [r.reference, r.title, r.sender_name, n?.full_name, n?.email].join(" ").toLowerCase().includes(q.toLowerCase()));
  }), [rows, tab, q, names]);
  const waiting = (rows || []).filter((r) => transferState(r) === "submitted").length;

  const decide = async () => {
    if (!confirm) return;
    const { row, action } = confirm;
    if (action === "reject" && !reason.trim()) return toast.error("Add a reason");
    setBusy(true);
    try {
      if (action === "approve" && row.source === "rayprop") {
        const { data, error } = await supabase.functions.invoke("bank-transfer-approve", { body: { id: row.id } });
        if (error || data?.error) throw new Error(data?.error || error?.message);
        data?.note ? toast.warning(`Approved, but needs attention: ${data.note}`) : toast.success(`Approved — partner booking ${String(data?.status || "").replace("_", " ")}`);
      } else {
        const { error } = await (supabase as any).rpc("staff_bank_transfer_action", { _id: row.id, _action: action, _reason: reason.trim() || null });
        if (error) throw new Error(error.message);
        toast.success(action === "approve" ? "Payment approved — booking confirmed" : "Transfer rejected and dates released");
      }
      setConfirm(null); setReason(""); void load();
    } catch (e: any) { toast.error(e.message || "Could not save"); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Bank transfers</h1>
        <p className="text-[13px] text-muted-foreground">Check the money arrived in the account, then approve or reject.</p>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <Tabs<TabKey> value={tab} onChange={setTab} tabs={[{ value: "waiting", label: `Waiting (${waiting})` }, { value: "approved", label: "Approved" }, { value: "rejected", label: "Rejected / expired" }]} />
        <input aria-label="Search transfers" placeholder="Reference, guest, sender" value={q} onChange={(e) => setQ(e.target.value)} className={input} />
      </div>
      {err ? <ErrorState onRetry={load} /> : !rows ? <ListSkeleton /> : shown.length === 0 ? <EmptyState title="Nothing here" body={tab === "waiting" ? "No transfers waiting to be checked." : undefined} /> : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-[13px]">
            <thead className="bg-surface text-left text-muted-foreground">
              <tr><th className="p-3">Guest</th><th className="p-3">Stay & dates</th><th className="p-3 text-right">Amount</th><th className="p-3">Sender</th><th className="p-3">Receipt</th><th className="p-3">Status</th><th className="p-3" /></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shown.map((r) => {
                const st = transferState(r); const n = names[r.guest_id]; const url = r.receipt_path ? urls[r.receipt_path] : null;
                return (
                  <tr key={r.id} className="align-top">
                    <td className="p-3"><div className="font-semibold">{n?.full_name || "Guest"}</div><div className="text-muted-foreground">{n?.email}</div></td>
                    <td className="p-3"><div className="font-semibold">{r.title || "Stay"}{r.source === "rayprop" && <span className="ml-1 text-xs text-muted-foreground">(partner)</span>}</div><div className="text-muted-foreground">{r.check_in} → {r.check_out}</div><div className="font-mono text-xs text-muted-foreground">{r.reference}</div></td>
                    <td className="p-3 text-right font-semibold tabular-nums">{fmt(r.amount_kobo)}</td>
                    <td className="p-3">{r.sender_name || "—"}<div className="text-xs text-muted-foreground">{r.submitted_at ? new Date(r.submitted_at).toLocaleString() : "Not sent yet"}</div></td>
                    <td className="p-3">{url ? <button onClick={() => setView(url)} aria-label="View receipt"><img src={url} alt="Receipt" className="w-12 h-12 rounded-md object-cover border border-border" /></button> : "—"}</td>
                    <td className="p-3"><Tag tone={st === "approved" ? "done" : st === "submitted" ? "act" : st === "awaiting_proof" ? "fact" : "broken"}>{LABEL[st]}</Tag>{r.reject_reason && <div className="text-xs text-muted-foreground mt-1">{r.reject_reason}</div>}</td>
                    <td className="p-3">
                      {(st === "submitted" || st === "awaiting_proof") && (
                        <div className="flex gap-2 justify-end">
                          <Button onClick={() => setConfirm({ row: r, action: "approve" })}>Approve</Button>
                          <Button variant="secondary" onClick={() => setConfirm({ row: r, action: "reject" })}>Reject</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Receipt</DialogTitle></DialogHeader>{view && <img src={view} alt="Receipt" className="w-full max-h-[75vh] object-contain" />}</DialogContent>
      </Dialog>

      <Dialog open={!!confirm} onOpenChange={(o) => { if (!o) { setConfirm(null); setReason(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{confirm?.action === "approve" ? "Approve this payment?" : "Reject this transfer?"}</DialogTitle></DialogHeader>
          {confirm && (
            <div className="space-y-3 text-[13px]">
              <p><strong>{fmt(confirm.row.amount_kobo)}</strong> from <strong>{confirm.row.sender_name || "—"}</strong> · ref <span className="font-mono">{confirm.row.reference}</span></p>
              {confirm.action === "approve" ? (
                <>
                  <p>Only approve if this exact amount is in the account. The booking will be confirmed and the guest and host told.</p>
                  {confirm.row.source === "rayprop" && <Notice tone="warn">Partner stay: we'll get a fresh price and book it now. If it's gone or the price went up, it moves to Needs attention.</Notice>}
                </>
              ) : (
                <label className="block"><span className="text-xs text-muted-foreground">Reason (the guest will see this)</span>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={3} placeholder="e.g. Amount doesn't match, no money received"
                    className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-[13px]" /></label>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button>
                <Button loading={busy} onClick={decide}>{confirm.action === "approve" ? "Approve" : "Reject"}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const LABEL: Record<string, string> = { awaiting_proof: "Waiting for receipt", submitted: "To check", approved: "Approved", rejected: "Rejected", expired: "Expired" };

export default AdminBankTransfers;
