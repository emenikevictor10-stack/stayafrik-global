import { TopBar } from "@/components/shell/TopBar";
import { Link } from "react-router-dom";
import { PROPERTIES } from "@/data/properties";
import {
  Building2,
  MessageSquare,
  Lock,
  Wallet,
  BadgeCheck,
  Inbox,
  type LucideIcon,
} from "lucide-react";

export const AgentDashboard = () => {
  const stats: { Icon: LucideIcon; l: string; v: string }[] = [
    { Icon: Building2, l: "Active listings", v: "12" },
    { Icon: MessageSquare, l: "New leads", v: "34" },
    { Icon: Lock, l: "In escrow", v: "₦142M" },
    { Icon: Wallet, l: "Commission MTD", v: "₦2.8M" },
  ];

  const activity: { Icon: LucideIcon; t: string; s: string; c: string }[] = [
    { Icon: BadgeCheck, t: "Verification approved", s: "SA-PROP-0421 · Lekki Phase 1", c: "success" },
    { Icon: Lock, t: "Escrow funded", s: "₦95M held · V.I apartment", c: "info" },
    { Icon: Inbox, t: "New inspection request", s: "Adaeze O. · GRA Phase 2 plot", c: "warn" },
  ];

  const colorMap: Record<string, string> = {
    success: "bg-success/15 text-success border-success/30",
    info: "bg-info/15 text-info border-info/30",
    warn: "bg-primary/15 text-primary border-primary/30",
    muted: "bg-secondary text-muted-foreground border-border",
  };

  return (
    <>
      <TopBar title="Agent Hub" subtitle="Welcome back, Emeka 👋" />
      <main className="px-5 pt-5 pb-8">
        <section className="rounded-2xl bg-card border border-border p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-grid opacity-25" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 border border-success/30 text-[10px] font-semibold text-success">
              ✓ Verified Agent · Tier 2
            </span>
            <h2 className="mt-3 text-xl font-extrabold tracking-tight leading-tight">
              You're earning <span className="text-primary">28% above</span> the average agent this month.
            </h2>
            <p className="text-xs text-muted-foreground mt-2">
              Keep verification scores high to unlock Tier 3 and lower commission rates.
            </p>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 mt-5">
          {stats.map((s) => (
            <div key={s.l} className="rounded-2xl bg-card border border-border p-4">
              <s.Icon className="w-5 h-5 text-primary" />
              <div className="text-primary font-extrabold text-xl mt-2">{s.v}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{s.l}</div>
            </div>
          ))}
        </section>

        <section className="mt-6">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-base font-bold">Recent activity</h2>
            <Link to="/escrow" className="text-xs text-primary font-semibold">
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {activity.map((a, i) => (
              <div key={i} className="flex items-start gap-3 rounded-2xl bg-card border border-border p-3.5">
                <div
                  className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${colorMap[a.c]}`}
                >
                  <a.Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{a.t}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{a.s}</div>
                </div>
              </div>
            ))}
          </div>
          <Link to="/escrow" className="mt-3 block w-full text-center rounded-xl border border-border bg-card py-2.5 text-xs font-bold text-primary">
            View more activity →
          </Link>
        </section>

        <section className="mt-6">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-base font-bold">Your top listings</h2>
            <Link to="/listings" className="text-xs text-primary font-semibold">
              Manage →
            </Link>
          </div>
          <div className="space-y-3">
            {PROPERTIES.slice(0, 3).map((p) => (
              <Link
                key={p.id}
                to={`/property/${p.id}`}
                className="flex gap-3 rounded-2xl bg-card border border-border p-3 hover:border-primary/50"
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
                  <h3 className="font-semibold text-sm truncate">{p.title}</h3>
                  <p className="text-[11px] text-muted-foreground truncate">📍 {p.location}</p>
                  <div className="text-primary font-extrabold text-sm mt-1.5">{p.price}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-success font-bold">✓ Live</span>
                    <span className="text-[10px] text-muted-foreground">· 1.2k views · 24 leads</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
};
