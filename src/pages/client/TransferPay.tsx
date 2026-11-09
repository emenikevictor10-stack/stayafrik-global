import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Copy, Landmark, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button, ErrorState, Notice } from "@/ui/kit";
import { Seo } from "@/components/seo/Seo";
import { secondsLeft, transferState } from "@/lib/bank-transfer";

const fmt = (k: number) => "₦" + Math.round(k / 100).toLocaleString();

const TransferPay = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [t, setT] = useState<any | null>(null);
  const [err, setErr] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [sender, setSender] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await (supabase as any).from("bank_transfers").select("*").eq("id", id).maybeSingle();
    if (error || !data) return setErr(true);
    setT(data);
  }, [id]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);

  if (err) return <main className="p-6 max-w-md mx-auto"><ErrorState message="We couldn't find this payment." /></main>;
  if (!t) return <main className="min-h-[50vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></main>;

  const st = transferState(t, now);
  const left = secondsLeft(t, now);
  const acct = t.meta?.account || {};
  const copy = (v: string, what: string) => { navigator.clipboard.writeText(v); toast.success(`${what} copied`); };

  const submit = async () => {
    if (!user) return;
    if (sender.trim().length < 2) return toast.error("Enter the name on the account you paid from");
    if (!file) return toast.error("Add a screenshot of your receipt");
    if (file.size > 5 * 1024 * 1024) return toast.error("Receipt must be under 5MB");
    setBusy(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
      const path = `${user.id}/${t.id}-${Date.now()}.${ext}`;
      const up = await supabase.storage.from("transfer-receipts").upload(path, file, { contentType: file.type || undefined });
      if (up.error) throw new Error(up.error.message);
      const { error } = await (supabase as any).rpc("submit_bank_transfer", { _id: t.id, _sender: sender.trim(), _receipt_path: path });
      if (error) throw new Error(error.message);
      toast.success("Thanks — we're checking your payment");
      void load();
    } catch (e: any) { toast.error(e.message || "Could not send"); } finally { setBusy(false); }
  };

  return (
    <main className="px-5 py-6 max-w-md mx-auto space-y-4 pb-32">
      <Seo title="Pay by bank transfer · StayGlobal" description="Complete your booking by bank transfer." />
      <div>
        <h1 className="text-xl font-bold">Pay by bank transfer</h1>
        <p className="text-[13px] text-muted-foreground">{t.title} · {t.check_in} → {t.check_out}</p>
      </div>

      {st === "awaiting_proof" && (
        <>
          <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
            <div className="flex items-center gap-2"><Landmark className="w-4 h-4 text-primary" /><h2 className="font-bold text-sm">Send exactly</h2></div>
            <Row label="Amount" value={fmt(t.amount_kobo)} onCopy={() => copy(String(Math.round(t.amount_kobo / 100)), "Amount")} big />
            <Row label="Bank" value={acct.bank} />
            <Row label="Account number" value={acct.number} onCopy={() => copy(acct.number, "Account number")} />
            <Row label="Account name" value={acct.name} />
            <Row label="Narration / reference" value={t.reference} onCopy={() => copy(t.reference, "Reference")} />
            <p className={left < 600 ? "text-[13px] font-semibold text-destructive" : "text-[13px] font-semibold text-primary"}>
              Dates held for {Math.floor(left / 3600)}h {String(Math.floor((left % 3600) / 60)).padStart(2, "0")}m {String(left % 60).padStart(2, "0")}s
            </p>
            {t.source === "rayprop" && <Notice tone="warn">Partner stay: we book it as soon as we confirm your payment. In the rare case it's gone, we'll offer another stay or a full refund.</Notice>}
          </div>
          <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
            <h2 className="font-bold text-sm">After you pay</h2>
            <label className="block"><span className="text-xs text-muted-foreground">Name on the account you paid from</span>
              <input value={sender} onChange={(e) => setSender(e.target.value)} maxLength={120} className="mt-1 w-full h-11 rounded-xl bg-secondary border border-border px-3 text-sm" /></label>
            <label className="flex items-center gap-2 min-h-11 rounded-xl border border-dashed border-border px-3 cursor-pointer text-sm">
              <Upload className="w-4 h-4" /> <span className="truncate">{file ? file.name : "Upload receipt screenshot"}</span>
              <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
            <Button className="w-full" loading={busy} onClick={submit}>I've paid</Button>
          </div>
        </>
      )}

      {st === "submitted" && <Notice>We got your receipt and are checking the payment. You'll get a notification and email once it's confirmed — usually within a few hours.</Notice>}
      {st === "approved" && <Notice>Payment confirmed. Your booking is ready.</Notice>}
      {st === "rejected" && <Notice tone="danger">We couldn't accept this transfer: {t.reject_reason}. Your dates were released. Contact support if you already paid.</Notice>}
      {st === "expired" && <Notice tone="danger">Time to pay ran out and your dates were released. If you already sent money, contact support with reference {t.reference}.</Notice>}

      <Link to={t.booking_id ? `/trips/${t.booking_id}` : "/bookings"} className="block text-center text-[13px] underline text-muted-foreground">Go to my trips</Link>
    </main>
  );
};

const Row = ({ label, value, onCopy, big }: { label: string; value: string; onCopy?: () => void; big?: boolean }) => (
  <div className="flex items-center justify-between gap-3">
    <div className="min-w-0"><div className="text-xs text-muted-foreground">{label}</div><div className={big ? "text-lg font-extrabold" : "text-sm font-semibold break-all"}>{value || "—"}</div></div>
    {onCopy && <button type="button" onClick={onCopy} aria-label={`Copy ${label}`} className="w-11 h-11 rounded-full border border-border flex items-center justify-center shrink-0"><Copy className="w-4 h-4" /></button>}
  </div>
);

export default TransferPay;
