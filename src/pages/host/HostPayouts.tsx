import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TopBar } from "@/components/shell/TopBar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useHostBookings } from "@/hooks/useHostBookings";
import { HostBookingCard } from "@/components/host/HostBookingCard";
import { EmptyState, ErrorState, ListSkeleton, Notice } from "@/ui/kit";
import { payoutTotals } from "@/lib/host-portal";

const fmt = (n: number) => "₦" + Math.round(n).toLocaleString();

const HostPayouts = () => {
  const { user } = useAuth();
  const { rows, loading, error, reload } = useHostBookings();
  const [account, setAccount] = useState<{ brand: string; last4: string } | null | undefined>(undefined);
  useEffect(() => {
    if (!user) return;
    supabase.from("payment_methods").select("brand, last4").eq("user_id", user.id).not("account_number", "is", null)
      .order("is_default", { ascending: false }).limit(1).maybeSingle().then(({ data }) => setAccount(data ?? null));
  }, [user?.id]);
  const [held, setHeld] = useState<{ id: string; amount: number; status: string; hold_reason: string | null; paid_reference: string | null; processed_at: string | null }[]>([]);
  useEffect(() => {
    if (!user) return;
    supabase.from("payouts").select("id, amount, status, hold_reason, paid_reference, processed_at").eq("host_id", user.id)
      .in("status", ["on_hold", "paid"]).order("created_at", { ascending: false }).limit(50).then(({ data }) => setHeld((data as any) || []));
  }, [user?.id]);
  const money = rows.filter((r) => ["confirmed", "released", "completed"].includes(r.status));
  const t = payoutTotals(money);
  return (
    <>
      <TopBar title="Payouts" />
      <main className="px-4 pt-4 pb-8 max-w-3xl mx-auto space-y-4">
        {account === null && <Notice tone="warn">Add your bank account so we can pay you. <Link to="/profile/payout" className="underline font-semibold">Add payout account</Link></Notice>}
        {account && <p className="text-sm text-muted-foreground">Paid to {account.brand} ····{account.last4} · <Link to="/profile/payout" className="underline">Change</Link></p>}
        <div className="grid grid-cols-3 gap-2">
          {[["Held", t.held, "Paid by guest, before check-in"], ["Due", t.due, "Being sent to you"], ["Done", t.done, "Stays finished"]].map(([l, v, d]) => (
            <div key={l as string} className="rounded-xl bg-card border border-border p-3">
              <p className="text-xs text-muted-foreground">{l}</p>
              <p className="text-base font-bold">{fmt(v as number)}</p>
              <p className="text-xs text-muted-foreground hidden sm:block">{d}</p>
            </div>
          ))}
        </div>
        {held.filter((p) => p.status === "on_hold").map((p) => <Notice key={p.id} tone="warn">{fmt(Number(p.amount))} is on hold: {p.hold_reason}</Notice>)}
        {held.some((p) => p.status === "paid") && (
          <div className="rounded-xl bg-card border border-border p-3 space-y-1">
            <p className="text-sm font-bold">Sent to you</p>
            {held.filter((p) => p.status === "paid").map((p) => (
              <p key={p.id} className="text-xs text-muted-foreground flex justify-between gap-2"><span>{p.processed_at ? new Date(p.processed_at).toLocaleDateString() : ""}{p.paid_reference ? ` · Ref ${p.paid_reference}` : ""}</span><span className="font-semibold text-foreground">{fmt(Number(p.amount))}</span></p>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">Your share is released the day after the guest checks in.</p>
        {loading ? <ListSkeleton /> : error ? <ErrorState onRetry={reload} /> : money.length === 0 ? (
          <EmptyState title="No payouts yet" body="Money from confirmed bookings shows here." />
        ) : [...money].reverse().map((r) => <HostBookingCard key={r.id} r={r} />)}
      </main>
    </>
  );
};
export default HostPayouts;
