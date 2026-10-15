import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw, Wallet, Webhook } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Seo } from "@/components/seo/Seo";
import { raypropRegisterWebhook, raypropRetry, raypropWallet, refreshRayPropStatus } from "@/lib/rayprop";
import { koboToNaira } from "@/lib/rayprop-map";

type Row = {
  id: string; check_in_date: string; check_out_date: string; total_price: number; status: string; created_at: string;
  partner_title: string | null; partner_city: string | null; rayprop_reservation_id: string | null; attention_reason: string | null;
};

const naira = (n: number) => "₦" + Math.round(Number(n || 0)).toLocaleString();
const LOW_BALANCE_NAIRA = 200_000;

const AdminPartnerBookings = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<{ balance: number; disabled?: boolean } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("bookings")
      .select("id,check_in_date,check_out_date,total_price,status,created_at,partner_title,partner_city,rayprop_reservation_id,attention_reason")
      .eq("source", "rayprop").order("created_at", { ascending: false }).limit(200);
    setRows((data as Row[]) || []);
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

  return (
    <>
      <Seo title="Partner bookings | Stay admin" description="RayProp partner reservations." noindex />
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold">Partner bookings</h1>
            <p className="text-xs text-muted-foreground">Stays booked through RayProp.</p>
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
              <p className="mt-1 text-[11px] text-destructive font-semibold">Low balance — top up so partner bookings can be confirmed.</p>
            )}
          </div>
          <div className="rounded-2xl bg-card border border-border p-4">
            <div className="text-xs text-muted-foreground">Needs attention</div>
            <div className={`mt-1 text-2xl font-extrabold ${attention.length ? "text-destructive" : ""}`}>{attention.length}</div>
            <p className="text-[11px] text-muted-foreground">Paid by the guest, not yet confirmed by RayProp.</p>
          </div>
        </div>

        {loading ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No partner bookings yet.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="rounded-2xl bg-card border border-border p-4 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="font-semibold text-sm">{r.partner_title || "Partner stay"}</div>
                  <div className="text-[11px] text-muted-foreground">{r.partner_city} · {r.check_in_date} → {r.check_out_date} · {naira(r.total_price)}</div>
                  <div className="text-[11px] text-muted-foreground font-mono">{r.rayprop_reservation_id || "no reservation yet"}</div>
                  {r.attention_reason && <div className="text-[11px] text-destructive mt-1">{r.attention_reason}</div>}
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-full border border-border capitalize">{r.status.replace("_", " ")}</span>
                {r.status === "needs_attention" ? (
                  <button onClick={() => run(r.id, () => raypropRetry(r.id), "Retried")} disabled={busy === r.id}
                    className="rounded-full bg-primary text-primary-foreground px-4 h-8 text-xs font-bold disabled:opacity-50">Retry</button>
                ) : r.rayprop_reservation_id ? (
                  <button onClick={() => run(r.id, () => refreshRayPropStatus(r.id), "Status refreshed")} disabled={busy === r.id} aria-label="Refresh status"
                    className="w-8 h-8 rounded-full border border-border flex items-center justify-center disabled:opacity-50"><RefreshCw className="w-3.5 h-3.5" /></button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default AdminPartnerBookings;
