import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { TopBar } from "@/components/shell/TopBar";
import { Seo } from "@/components/seo/Seo";
import { Button, ErrorState, ListSkeleton, Notice, Tag } from "@/ui/kit";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { loadPaystackInline } from "@/lib/paystack-inline";
import { SignInSheet } from "@/components/auth/SignInSheet";
import { toast } from "sonner";
import { useSettings } from "@/hooks/useSettings";

const fmtK = (k: number) => "₦" + Math.round(Number(k || 0) / 100).toLocaleString();

/** Start a Paystack payment through paystack-init, then verify it server-side. Resolves with the verify reply. */
export async function payViaPaystack(body: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.functions.invoke("paystack-init", { body: { ...body, callback_url: window.location.href } });
  if (error || !data?.access_code) throw new Error(data?.error || error?.message || "Could not start payment");
  await loadPaystackInline();
  const Pop = (window as any).PaystackPop;
  return new Promise((resolve, reject) => {
    new Pop().resumeTransaction(data.access_code, {
      onSuccess: async (tx: { reference: string }) => {
        const v = await supabase.functions.invoke("paystack-verify", { body: { reference: tx.reference || data.reference } });
        if (v.error || v.data?.error) reject(new Error(v.data?.error || "Payment received — we're still confirming it")); else resolve(v.data);
      },
      onCancel: () => reject(new Error("Payment cancelled")),
      onError: (e: any) => reject(new Error(e?.message || "Payment failed")),
    });
  });
}

type Share = { id: string; share_no: number; amount_kobo: number; status: string; token: string; label: string | null };

/** Lead guest's view of a split booking: who has paid, and links to send. */
export const SplitPanel = ({ bookingId, onChange }: { bookingId: string; onChange: () => void }) => {
  const [shares, setShares] = useState<Share[] | null>(null);
  const load = useCallback(async () => {
    const { data } = await supabase.from("payment_shares").select("id,share_no,amount_kobo,status,token,label").eq("booking_id", bookingId).order("share_no");
    setShares((data as Share[]) || []);
  }, [bookingId]);
  useEffect(() => { void load(); }, [load]);
  if (!shares?.length) return null;
  const paid = shares.filter((s) => s.status === "paid").length;
  const copy = (s: Share) => {
    const url = `${window.location.origin}/pay/share/${s.token}`;
    if (navigator.share) navigator.share({ title: "Pay your share on Stay", url }).catch(() => {});
    else navigator.clipboard.writeText(url).then(() => toast.success("Link copied"));
  };
  return (
    <section className="rounded-xl border border-border p-3 space-y-2">
      <div className="flex justify-between items-center"><h2 className="text-[15px] font-semibold">Split payment</h2><span className="text-[13px] text-muted-foreground">{paid} of {shares.length} paid</span></div>
      <p className="text-xs text-muted-foreground">The booking is confirmed when everyone has paid. If the time runs out, everyone who paid gets a full refund.</p>
      {shares.map((s) => (
        <div key={s.id} className="flex items-center justify-between gap-2 text-[13px]">
          <span>{s.label || `Person ${s.share_no}`} · {fmtK(s.amount_kobo)}</span>
          {s.status === "paid" ? <Tag tone="done">Paid</Tag>
            : s.share_no === 1 ? <Button className="h-11 px-3 text-[13px]" onClick={() => payViaPaystack({ mode: "share", token: s.token }).then(() => { toast.success("Paid"); load(); onChange(); }, (e) => toast.error(e.message))}>Pay</Button>
            : <button type="button" onClick={() => copy(s)} className="min-h-11 px-3 rounded-lg border border-border font-semibold">Send link</button>}
        </div>
      ))}
    </section>
  );
};

type Addon = { id: string; name: string; description: string | null; price_kobo: number; unit: string };
type Order = { id: string; addon_name: string; qty: number; amount_kobo: number; status: string };

/** Extras for a confirmed trip, plus the guest's orders. */
export const AddonsPanel = ({ bookingId }: { bookingId: string }) => {
  const { features } = useSettings();
  const [addons, setAddons] = useState<Addon[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const load = useCallback(async () => {
    const [a, o] = await Promise.all([
      supabase.from("addons").select("id,name,description,price_kobo,unit").eq("active", true).order("sort"),
      supabase.from("addon_orders").select("id,addon_name,qty,amount_kobo,status").eq("booking_id", bookingId).neq("status", "cancelled").order("created_at"),
    ]);
    setAddons((a.data as Addon[]) || []); setOrders((o.data as Order[]) || []);
  }, [bookingId]);
  useEffect(() => { void load(); }, [load]);
  if (!features.addons || (!addons.length && !orders.length)) return null;
  const buy = async (a: Addon) => {
    setBusy(a.id);
    try { await payViaPaystack({ mode: "addon", booking_id: bookingId, addon_id: a.id, qty: qty[a.id] || 1 }); toast.success(`${a.name} ordered — we'll arrange it`); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); load(); }
  };
  return (
    <section className="space-y-2">
      <h2 className="text-[15px] font-semibold">Add to your stay</h2>
      {orders.filter((o) => o.status !== "pending_payment").map((o) => (
        <div key={o.id} className="flex justify-between text-[13px]"><span>{o.addon_name} × {o.qty} · {fmtK(o.amount_kobo)}</span><Tag tone={o.status === "arranged" ? "done" : "act"}>{o.status === "paid" ? "Being arranged" : o.status.replace(/_/g, " ")}</Tag></div>
      ))}
      <div className="grid gap-2 sm:grid-cols-2">
        {addons.map((a) => (
          <div key={a.id} className="rounded-xl border border-border p-3 space-y-1">
            <div className="flex justify-between gap-2"><p className="font-semibold text-[15px]">{a.name}</p><p className="text-[13px] font-semibold">{fmtK(a.price_kobo)}<span className="text-muted-foreground font-normal"> / {a.unit}</span></p></div>
            {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}
            <div className="flex items-center gap-2 pt-1">
              <select aria-label={`How many ${a.name}`} value={qty[a.id] || 1} onChange={(e) => setQty({ ...qty, [a.id]: Number(e.target.value) })} className="h-11 rounded-lg border border-border bg-background px-2">
                {Array.from({ length: 10 }, (_, i) => <option key={i + 1}>{i + 1}</option>)}
              </select>
              <Button className="h-11 px-3 text-[13px]" loading={busy === a.id} onClick={() => buy(a)}>Add · {fmtK(a.price_kobo * (qty[a.id] || 1))}</Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

type ShareInfo = { share_id: string; amount_kobo: number; status: string; booking_status: string; title: string; city: string | null; check_in: string; check_out: string; lead_first_name: string; shares_total: number; shares_paid: number; expires_at: string };

/** /pay/share/:token — a friend pays their part of a split booking. */
export const PayShare = () => {
  const { token } = useParams();
  const { user } = useAuth();
  const [info, setInfo] = useState<ShareInfo | null | undefined>(undefined);
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [signIn, setSignIn] = useState(false);
  const load = useCallback(async () => {
    setErr(false);
    const { data, error } = await supabase.rpc("get_payment_share", { _token: token || "" });
    if (error) return setErr(true);
    setInfo(((data as ShareInfo[]) || [])[0] ?? null);
  }, [token]);
  useEffect(() => { void load(); }, [load]);
  const pay = async () => {
    if (!user) return setSignIn(true);
    setBusy(true);
    try { await payViaPaystack({ mode: "share", token }); toast.success("Thanks — your share is paid"); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); load(); }
  };
  const open = info && info.status === "pending" && info.booking_status === "held" && new Date(info.expires_at) > new Date();
  return (
    <>
      <Seo title="Pay your share · Stay" description="Pay your part of a shared stay." noindex />
      <TopBar title="Pay your share" />
      <main className="px-4 md:px-0 py-6 max-w-[520px] mx-auto space-y-4">
        {err ? <ErrorState message="This link didn't load." onRetry={load} /> : info === undefined ? <ListSkeleton rows={2} /> : !info ? (
          <Notice tone="warn">This payment link isn't valid. Ask your friend to send it again.</Notice>
        ) : (
          <>
            <h1 className="text-xl font-semibold">{info.lead_first_name} invited you to share a stay</h1>
            <dl className="rounded-xl border border-border divide-y divide-border text-[13px]">
              <div className="p-3 flex justify-between"><dt className="text-muted-foreground">Stay</dt><dd className="text-right">{info.title}{info.city ? `, ${info.city}` : ""}</dd></div>
              <div className="p-3 flex justify-between"><dt className="text-muted-foreground">Dates</dt><dd>{info.check_in} → {info.check_out}</dd></div>
              <div className="p-3 flex justify-between"><dt className="text-muted-foreground">Your share</dt><dd className="font-semibold">{fmtK(info.amount_kobo)}</dd></div>
              <div className="p-3 flex justify-between"><dt className="text-muted-foreground">Paid so far</dt><dd>{info.shares_paid} of {info.shares_total}</dd></div>
            </dl>
            {info.status === "paid" ? <Notice>Your share is paid. The booking confirms once everyone has paid.</Notice>
              : open ? <>
                  <Button className="w-full" loading={busy} onClick={pay}>Pay {fmtK(info.amount_kobo)}</Button>
                  <p className="text-xs text-muted-foreground">Everyone must pay by {new Date(info.expires_at).toLocaleString("en-NG")}. If not, every share is refunded in full.</p>
                </>
              : <Notice tone="warn">This booking is no longer waiting for payment.</Notice>}
            <Link to="/" className="block text-center text-[13px] underline">Browse stays</Link>
          </>
        )}
      </main>
      <SignInSheet open={signIn} onOpenChange={setSignIn} returnPath={`/pay/share/${token}`} title="Sign in to pay your share" />
    </>
  );
};
