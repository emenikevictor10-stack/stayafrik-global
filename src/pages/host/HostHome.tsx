import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { TopBar } from "@/components/shell/TopBar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMyListings } from "@/hooks/useListings";
import { useHostBookings } from "@/hooks/useHostBookings";
import { HostBookingCard } from "@/components/host/HostBookingCard";
import { NextStep, ListSkeleton } from "@/ui/kit";
import { groupBookings, payoutTotals, timeLeft } from "@/lib/host-portal";

const fmt = (n: number) => "₦" + Math.round(n).toLocaleString();

const HostHome = () => {
  const { user } = useAuth();
  const { rows, loading } = useHostBookings();
  const { data: listings } = useMyListings(user?.id);
  const [hasAccount, setHasAccount] = useState<boolean | null>(null);
  const [profileOk, setProfileOk] = useState<boolean | null>(null);
  useEffect(() => {
    if (!user) return;
    supabase.from("payment_methods").select("id").eq("user_id", user.id).not("account_number", "is", null).limit(1)
      .then(({ data }) => setHasAccount(!!data?.length));
    supabase.from("profiles").select("full_name, whatsapp, avatar_url").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setProfileOk(!!(data?.full_name && data?.whatsapp)));
  }, [user?.id]);

  const today = format(new Date(), "yyyy-MM-dd");
  const g = groupBookings(rows, today);
  const requests = rows.filter((r) => r.status === "awaiting_host");
  const arriving = g.upcoming.filter((r) => r.check_in_date === today).concat(g.current.filter((r) => r.check_in_date === today));
  const leaving = rows.filter((r) => ["released", "confirmed"].includes(r.status) && r.check_out_date === today);
  const money = payoutTotals(rows);
  const pending = listings.filter((l) => !l.verified).length;

  return (
    <>
      <TopBar title="Hosting" />
      <main className="px-4 pt-4 pb-8 max-w-4xl mx-auto space-y-4">
        <div className="space-y-2">
          {requests.length > 0 && <NextStep tone="act" status={`${requests.length} request${requests.length > 1 ? "s" : ""} waiting`} sentence={`Reply before the time runs out (${timeLeft(requests[0].host_respond_by)}) or the guest is refunded.`} action={<Link to="/host/requests" className="underline font-semibold text-sm">Answer</Link>} />}
          {hasAccount === false && <NextStep tone="act" status="No payout account" sentence="Add your bank account so we can pay you after check-in." action={<Link to="/profile/payout" className="underline font-semibold text-sm">Add payout account</Link>} />}
          {profileOk === false && <NextStep tone="act" status="Profile not finished" sentence="Add your full name and WhatsApp number." action={<Link to="/profile/edit" className="underline font-semibold text-sm">Finish your profile</Link>} />}
          {pending > 0 && <NextStep tone="fact" status={`${pending} listing${pending > 1 ? "s" : ""} waiting for approval`} sentence="Our team checks every new stay before guests can see it." />}
          {listings.length === 0 && <NextStep tone="act" status="No stays yet" sentence="List your first place to start getting bookings." action={<Link to="/listings/new" className="underline font-semibold text-sm">List your place</Link>} />}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[["Arriving today", String(arriving.length)], ["Leaving today", String(leaving.length)], ["Held", fmt(money.held)], ["Due to you", fmt(money.due)]].map(([l, v]) => (
            <div key={l} className="rounded-xl bg-card border border-border p-3"><p className="text-xs text-muted-foreground">{l}</p><p className="text-base font-bold">{v}</p></div>
          ))}
        </div>

        <nav className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm font-semibold">
          {[["/host/listings", "Listings"], ["/host/calendar", "Calendar"], ["/host/requests", "Requests"], ["/host/bookings", "Bookings"], ["/host/payouts", "Payouts"]].map(([to, l]) => (
            <Link key={to} to={to} className="min-h-11 rounded-xl border border-border bg-card flex items-center justify-center">{l}</Link>
          ))}
        </nav>

        <section className="space-y-2">
          <h2 className="text-sm font-bold">Next stays</h2>
          {loading ? <ListSkeleton rows={2} /> : g.upcoming.length + g.current.length === 0
            ? <p className="text-sm text-muted-foreground">No guests booked yet.</p>
            : [...g.current, ...g.upcoming].slice(0, 3).map((r) => <HostBookingCard key={r.id} r={r} />)}
        </section>
      </main>
    </>
  );
};
export default HostHome;
