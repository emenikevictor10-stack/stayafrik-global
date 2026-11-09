import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { TopBar } from "@/components/shell/TopBar";
import { Seo } from "@/components/seo/Seo";
import { Button, ErrorState, ListSkeleton, Notice, Tag } from "@/ui/kit";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { loadPaystackInline } from "@/lib/paystack-inline";
import { SignInSheet } from "@/components/auth/SignInSheet";
import { toast } from "sonner";
import { useSettings } from "@/hooks/useSettings";
import { ADDON_STATUS_LABEL, addonsForCity, canBuyAddon, guestAddonCancelNext, type AddonStatus } from "@/lib/addons";

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

type Share = { id: string; share_no: number; amount_kobo: number; status: string; token: string; label: string | null; name: string | null; email: string | null; pay_method: string | null; last_reminded_at: string | null };

/** Lead guest's view of a split booking: who has paid, links to send, reminders and removing someone. */
export const SplitPanel = ({ bookingId, onChange }: { bookingId: string; onChange: () => void }) => {
  const [shares, setShares] = useState<Share[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => {
    const { data } = await supabase.from("payment_shares").select("id,share_no,amount_kobo,status,token,label,name,email,pay_method,last_reminded_at").eq("booking_id", bookingId).neq("status", "void").order("share_no");
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
  const act = async (s: Share, action: "remind" | "remove") => {
    if (action === "remove" && !window.confirm(`Remove ${s.name || s.label || "this person"}? Their ${fmtK(s.amount_kobo)} moves to your share and their link stops working.`)) return;
    setBusy(s.id + action);
    const { error } = await supabase.rpc("split_share_action", { _share_id: s.id, _action: action });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(action === "remind" ? (s.email ? "Reminder sent" : "Reminder noted — share the link with them too") : "Removed");
    load(); onChange();
  };
  return (
    <section className="rounded-xl border border-border p-3 space-y-2">
      <div className="flex justify-between items-center"><h2 className="text-[15px] font-semibold">Split payment</h2><span className="text-[13px] text-muted-foreground">{paid} of {shares.length} paid</span></div>
      <p className="text-xs text-muted-foreground">The booking is confirmed when everyone has paid. If the time runs out, everyone who paid gets a full refund.</p>
      {shares.map((s) => (
        <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 text-[13px] border-t border-border pt-2 first-of-type:border-0">
          <span className="min-w-0">
            <span className="font-semibold">{s.share_no === 1 ? "You" : s.name || s.label || `Person ${s.share_no}`}</span> · {fmtK(s.amount_kobo)}
            {s.pay_method === "bank_transfer" && s.status === "pending" && <span className="block text-xs text-muted-foreground">Paying by bank transfer</span>}
          </span>
          {s.status === "paid" ? <Tag tone="done">Paid</Tag>
            : s.label?.startsWith("You") ? <Button className="h-11 px-3 text-[13px]" onClick={() => payViaPaystack({ mode: "share", token: s.token }).then(() => { toast.success("Paid"); load(); onChange(); }, (e) => toast.error(e.message))}>Pay</Button>
            : <div className="flex gap-1">
                <button type="button" onClick={() => copy(s)} className="min-h-11 px-3 rounded-lg border border-border font-semibold">Send link</button>
                <button type="button" disabled={busy === s.id + "remind"} onClick={() => act(s, "remind")} className="min-h-11 px-3 rounded-lg border border-border font-semibold">Remind</button>
                <button type="button" disabled={busy === s.id + "remove"} onClick={() => act(s, "remove")} className="min-h-11 px-3 rounded-lg border border-border font-semibold text-destructive">Remove</button>
              </div>}
        </div>
      ))}
    </section>
  );
};

type Addon = { id: string; name: string; description: string | null; price_kobo: number; unit: string; city_id: string | null };
type Order = { id: string; addon_name: string; qty: number; amount_kobo: number; status: string; staff_note: string | null };

/** Extras for a confirmed trip (filtered by the stay's city), plus the guest's orders. */
export const AddonsPanel = ({ bookingId }: { bookingId: string }) => {
  const { features } = useSettings();
  const navigate = useNavigate();
  const [addons, setAddons] = useState<Addon[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [canBuy, setCanBuy] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const load = useCallback(async () => {
    const [a, o, b] = await Promise.all([
      supabase.from("addons").select("id,name,description,price_kobo,unit,city_id").eq("active", true).order("sort"),
      supabase.from("addon_orders").select("id,addon_name,qty,amount_kobo,status,staff_note").eq("booking_id", bookingId).neq("status", "cancelled").order("created_at"),
      supabase.from("bookings").select("status,check_in_date,rayprop_listing_id,listings(city_id)").eq("id", bookingId).maybeSingle(),
    ]);
    let cityId: string | null = (b.data as any)?.listings?.city_id ?? null;
    if (!cityId && b.data?.rayprop_listing_id) {
      const { data: m } = await supabase.from("partner_location_map").select("city_id").eq("rayprop_listing_id", b.data.rayprop_listing_id).maybeSingle();
      cityId = m?.city_id ?? null;
    }
    const today = new Date(Date.now() + 3600_000).toISOString().slice(0, 10);
    setCanBuy(!!b.data && canBuyAddon(b.data.status, b.data.check_in_date, today));
    setAddons(addonsForCity((a.data as Addon[]) || [], cityId)); setOrders((o.data as Order[]) || []);
  }, [bookingId]);
  useEffect(() => { void load(); }, [load]);
  if (!features.addons || ((!canBuy || !addons.length) && !orders.length)) return null;
  const buy = async (a: Addon, method: "card" | "bank") => {
    setBusy(a.id + method);
    try {
      if (method === "bank") {
        const { data, error } = await supabase.functions.invoke("paystack-init", { body: { mode: "addon", booking_id: bookingId, addon_id: a.id, qty: qty[a.id] || 1, method: "bank_transfer" } });
        if (error || !data?.bank_transfer?.id) {
          const ctx: any = (error as any)?.context; const msg = ctx?.json ? (await ctx.json().catch(() => null))?.error : null;
          throw new Error(msg || data?.error || "Could not start the bank transfer");
        }
        navigate(`/pay/transfer/${data.bank_transfer.id}`); return;
      }
      await payViaPaystack({ mode: "addon", booking_id: bookingId, addon_id: a.id, qty: qty[a.id] || 1 }); toast.success(`${a.name} ordered — we'll arrange it`);
    }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); load(); }
  };
  const cancel = async (o: Order) => {
    if (!window.confirm(o.status === "pending_payment" ? `Cancel ${o.addon_name}?` : `Cancel ${o.addon_name}? We'll refund ${fmtK(o.amount_kobo)}.`)) return;
    setBusy(o.id);
    const { error } = await supabase.rpc("guest_addon_cancel", { _order_id: o.id });
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success("Extra cancelled"); load(); }
  };
  return (
    <section className="space-y-2">
      <h2 className="text-[15px] font-semibold">Add to your stay</h2>
      {orders.map((o) => (
        <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
          <span>{o.addon_name} × {o.qty} · {fmtK(o.amount_kobo)}{o.staff_note && ["confirmed", "done"].includes(o.status) ? <span className="block text-xs text-muted-foreground">{o.staff_note}</span> : null}</span>
          <span className="flex items-center gap-2">
            <Tag tone={["confirmed", "done", "refunded"].includes(o.status) ? "done" : "act"}>{ADDON_STATUS_LABEL[o.status] ?? o.status}</Tag>
            {guestAddonCancelNext(o.status as AddonStatus) && <button type="button" disabled={busy === o.id} onClick={() => cancel(o)} className="min-h-11 px-2 text-[13px] font-semibold underline">Cancel</button>}
          </span>
        </div>
      ))}
      {canBuy && <div className="grid gap-2 sm:grid-cols-2">
        {addons.map((a) => (
          <div key={a.id} className="rounded-xl border border-border p-3 space-y-1">
            <div className="flex justify-between gap-2"><p className="font-semibold text-[15px]">{a.name}</p><p className="text-[13px] font-semibold">{fmtK(a.price_kobo)}<span className="text-muted-foreground font-normal"> / {a.unit}</span></p></div>
            {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <select aria-label={`How many ${a.name}`} value={qty[a.id] || 1} onChange={(e) => setQty({ ...qty, [a.id]: Number(e.target.value) })} className="h-11 rounded-lg border border-border bg-background px-2">
                {Array.from({ length: 10 }, (_, i) => <option key={i + 1}>{i + 1}</option>)}
              </select>
              {features.card_payments !== false && <Button className="h-11 px-3 text-[13px]" loading={busy === a.id + "card"} onClick={() => buy(a, "card")}>Add · {fmtK(a.price_kobo * (qty[a.id] || 1))}</Button>}
              {features.bank_transfer && <Button variant="secondary" className="h-11 px-3 text-[13px]" loading={busy === a.id + "bank"} onClick={() => buy(a, "bank")}>Pay by transfer</Button>}
            </div>
          </div>
        ))}
      </div>}
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
  const navigate = useNavigate();
  const { features } = useSettings();
  const pay = async (method: "card" | "bank") => {
    if (!user) return setSignIn(true);
    setBusy(true);
    try {
      if (method === "bank") {
        const { data, error } = await supabase.functions.invoke("paystack-init", { body: { mode: "share", token, method: "bank_transfer" } });
        if (error || !data?.bank_transfer?.id) {
          const ctx: any = (error as any)?.context; const msg = ctx?.json ? (await ctx.json().catch(() => null))?.error : null;
          throw new Error(msg || data?.error || "Could not start the bank transfer");
        }
        navigate(`/pay/transfer/${data.bank_transfer.id}`); return;
      }
      await payViaPaystack({ mode: "share", token }); toast.success("Thanks — your share is paid");
    }
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
                  {features.card_payments !== false && <Button className="w-full" loading={busy} onClick={() => pay("card")}>Pay {fmtK(info.amount_kobo)} by card</Button>}
                  {features.bank_transfer && <Button variant="secondary" className="w-full" disabled={busy} onClick={() => pay("bank")}>Pay by bank transfer</Button>}
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
