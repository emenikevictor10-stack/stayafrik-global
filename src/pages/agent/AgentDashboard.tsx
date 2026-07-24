import { TopBar } from "@/components/shell/TopBar";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMyListings } from "@/hooks/useListings";
import { supabase } from "@/integrations/supabase/client";
import {
  Building2,
  MessageSquare,
  Lock,
  Wallet,
  BadgeCheck,
  Plus,
  TrendingUp,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { HostProfileProgress } from "@/components/agent/HostProfileProgress";

const formatNaira = (n: number) =>
  n >= 1_000_000 ? `₦${(n / 1_000_000).toFixed(1)}M` : `₦${n.toLocaleString()}`;

export const AgentDashboard = () => {
  const { user, profile } = useAuth();
  const { data: myListings, loading } = useMyListings(user?.id);
  const [bookingStats, setBookingStats] = useState({ count: 0, escrow: 0, mtd: 0 });
  const [unreadMsgs, setUnreadMsgs] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const ids = myListings.map((l) => l.id);
      if (ids.length) {
        const { data } = await supabase
          .from("bookings")
          .select("total_price, status, created_at")
          .in("listing_id", ids);
        const rows = data || [];
        const now = new Date();
        const mtd = rows
          .filter(
            (r: any) =>
              new Date(r.created_at).getMonth() === now.getMonth() &&
              new Date(r.created_at).getFullYear() === now.getFullYear(),
          )
          .reduce((a: number, r: any) => a + Number(r.total_price || 0), 0);
        const escrow = rows
          .filter((r: any) => r.status === "pending" || r.status === "confirmed")
          .reduce((a: number, r: any) => a + Number(r.total_price || 0), 0);
        setBookingStats({ count: rows.length, escrow, mtd });
      }
      const { data: notifs } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", user.id)
        .eq("type", "message")
        .is("read_at", null);
      setUnreadMsgs(notifs?.length || 0);
    })();
  }, [user, myListings]);

  const firstName = (profile?.full_name || "host").split(" ")[0];
  const liveCount = myListings.filter((p) => p.verified).length;

  const stats: { Icon: LucideIcon; l: string; v: string; to: string }[] = [
    { Icon: Building2, l: "Live listings", v: String(liveCount), to: "/listings" },
    { Icon: MessageSquare, l: "Unread leads", v: String(unreadMsgs), to: "/messages" },
    { Icon: Lock, l: "In escrow", v: formatNaira(bookingStats.escrow), to: "/escrow" },
    { Icon: Wallet, l: "Earned MTD", v: formatNaira(bookingStats.mtd), to: "/profile/commission" },
  ];

  const quickActions: { Icon: LucideIcon; label: string; to: string; primary?: boolean }[] = [
    { Icon: Plus, label: "New listing", to: "/listings/new", primary: true },
    { Icon: ShieldCheck, label: "Escrow", to: "/escrow" },
    { Icon: MessageSquare, label: "Inbox", to: "/messages" },
    { Icon: TrendingUp, label: "Insights", to: "/profile/performance" },
  ];

  return (
    <>
      <TopBar title="​" subtitle="​" />
      <main className="px-5 pt-5 pb-8">
        <HostProfileProgress />
        {/* Hero earnings card */}
        <section className="relative overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/25 via-primary/5 to-transparent p-5">
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-primary/30 blur-3xl rounded-full pointer-events-none" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/15 border border-success/30 text-[10px] font-bold text-success">
              <BadgeCheck className="w-3 h-3" /> Verified Host
            </span>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight leading-tight">
              Welcome back, <span className="text-primary">{firstName}</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-1.5">
              {bookingStats.count > 0
                ? `${bookingStats.count} bookings · ${formatNaira(bookingStats.mtd)} this month`
                : "Your earnings appear here once guests book."}
            </p>
            <Link
              to="/profile/commission"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-xs font-extrabold shadow-glow"
            >
              <Wallet className="w-3.5 h-3.5" /> View earnings <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>

        {/* Quick actions */}
        <section className="mt-5 grid grid-cols-4 gap-2">
          {quickActions.map((a) => (
            <Link
              key={a.label}
              to={a.to}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl py-3 border transition-colors ${
                a.primary
                  ? "bg-primary text-primary-foreground border-primary shadow-glow"
                  : "bg-card border-border text-foreground hover:border-primary/50"
              }`}
            >
              <a.Icon className="w-4 h-4" />
              <span className="text-[10px] font-bold">{a.label}</span>
            </Link>
          ))}
        </section>

        {/* Stats grid */}
        <section className="grid grid-cols-2 gap-3 mt-5">
          {stats.map((s) => (
            <Link
              key={s.l}
              to={s.to}
              className="rounded-2xl bg-card border border-border p-4 hover:border-primary/50 transition-colors"
            >
              <s.Icon className="w-5 h-5 text-primary" />
              <div className="text-foreground font-extrabold text-xl mt-2">{s.v}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{s.l}</div>
            </Link>
          ))}
        </section>

        {/* My listings */}
        <section className="mt-7">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-base font-bold">Your listings</h2>
            <Link to="/listings" className="text-xs text-primary font-semibold">
              Manage →
            </Link>
          </div>
          {loading && (
            <div className="text-center py-10 text-muted-foreground text-sm">
              <div className="w-6 h-6 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin mb-2" />
              Loading…
            </div>
          )}
          {!loading && myListings.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center">
              <Sparkles className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-semibold">No listings yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                List your first property and start earning.
              </p>
              <Link
                to="/listings/new"
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-2 text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5" /> Create listing
              </Link>
            </div>
          )}
          <div className="space-y-3">
            {myListings.slice(0, 3).map((p) => (
              <Link
                key={p.id}
                to={`/listings/${p.id}/edit`}
                className="flex gap-3 rounded-2xl bg-card border border-border p-3 hover:border-primary/50 transition-colors"
              >
                <img
                  src={p.image}
                  alt={p.title}
                  width={120}
                  height={120}
                  loading="lazy"
                  className="w-20 h-20 rounded-xl object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm truncate">{p.title}</h3>
                    {p.verified ? (
                      <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/30">
                        ✓ Live
                      </span>
                    ) : (
                      <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                        Review
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">📍 {p.location}</p>
                  <div className="text-primary font-extrabold text-sm mt-1.5">{p.price}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Switch to guest banner */}
        <section className="mt-6 rounded-2xl bg-card border border-border p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-xl shrink-0">
            🌍
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm">Looking for a stay?</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Switch to guest mode from your profile.</p>
          </div>
          <Link
            to="/profile"
            className="shrink-0 text-[11px] font-bold text-primary"
          >
            Switch →
          </Link>
        </section>
      </main>
    </>
  );
};
