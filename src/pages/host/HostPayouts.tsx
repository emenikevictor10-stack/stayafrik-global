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
        <p className="text-xs text-muted-foreground">Your share is released the day after the guest checks in.</p>
        {loading ? <ListSkeleton /> : error ? <ErrorState onRetry={reload} /> : money.length === 0 ? (
          <EmptyState title="No payouts yet" body="Money from confirmed bookings shows here." />
        ) : [...money].reverse().map((r) => <HostBookingCard key={r.id} r={r} />)}
      </main>
    </>
  );
};
export default HostPayouts;
