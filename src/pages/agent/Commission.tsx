import { TopBar } from "@/components/shell/TopBar";
import { ChevronLeft, ArrowDownToLine, Banknote } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const months = [
  { m: "Nov", v: 0.6 },
  { m: "Dec", v: 0.45 },
  { m: "Jan", v: 0.78 },
  { m: "Feb", v: 0.92 },
  { m: "Mar", v: 0.7 },
  { m: "Apr", v: 1.0 },
];

const payouts = [
  { d: "Apr 14", p: "Lekki Phase 1 detached", a: "₦2,775,000", s: "Released" },
  { d: "Apr 02", p: "VI 3-bed apartment", a: "₦1,425,000", s: "Released" },
  { d: "Mar 28", p: "GRA Phase 2 plot", a: "₦825,000", s: "Released" },
  { d: "Mar 19", p: "Maitama suite", a: "₦1,950,000", s: "Released" },
  { d: "Apr 17", p: "Banana Island land", a: "₦3,400,000", s: "Pending" },
];

const Commission = () => {
  const max = Math.max(...months.map((m) => m.v));

  return (
    <>
      <TopBar title="Commission & payouts" subtitle="Earnings at a glance" />
      <main className="px-5 pt-4 pb-8">
        <Link
          to="/profile"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Back to profile
        </Link>

        {/* Balance card */}
        <section className="relative rounded-3xl bg-gradient-to-br from-primary/30 via-primary/10 to-card border border-primary/30 p-5 overflow-hidden">
          <div className="absolute inset-0 bg-grid opacity-30" />
          <div className="relative">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider">
              Available balance
            </div>
            <div className="mt-1 text-4xl font-extrabold tracking-tight">
              ₦<span className="text-primary">2,800,000</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              ₦3,400,000 pending release
            </div>
            <button
              onClick={() => toast.success("Withdraw flow coming soon")}
              className="mt-4 w-full rounded-2xl bg-primary text-primary-foreground py-3 font-bold text-sm flex items-center justify-center gap-2 shadow-glow"
            >
              <ArrowDownToLine className="w-4 h-4" /> Withdraw to bank
            </button>
          </div>
        </section>

        {/* Chart */}
        <section className="mt-4 rounded-2xl bg-card border border-border p-4">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="text-sm font-bold">6-month earnings</h3>
            <span className="text-[11px] text-success font-bold">↑ 28% vs avg</span>
          </div>
          <div className="flex items-end gap-2 h-32">
            {months.map((m) => (
              <div key={m.m} className="flex-1 flex flex-col items-center gap-1.5">
                <div
                  className={`w-full rounded-t-md transition-all ${
                    m.v === max
                      ? "bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.5)]"
                      : "bg-primary/40"
                  }`}
                  style={{ height: `${m.v * 100}%` }}
                />
                <div className="text-[10px] text-muted-foreground">{m.m}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Bank account */}
        <section className="mt-4 rounded-2xl bg-card border border-border p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Banknote className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-muted-foreground">Payout account</div>
            <div className="text-sm font-semibold">GTBank · •••• 4419</div>
          </div>
          <Link to="/profile/payout" className="text-[11px] text-primary font-semibold">Change</Link>
        </section>

        {/* History */}
        <section className="mt-5">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-sm font-bold">Recent payouts</h3>
            <button className="text-[11px] text-primary font-semibold">Export CSV</button>
          </div>
          <div className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
            {payouts.map((p, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                <div className="text-center w-10 shrink-0">
                  <div className="text-[10px] text-muted-foreground uppercase">{p.d.split(" ")[0]}</div>
                  <div className="text-sm font-bold">{p.d.split(" ")[1]}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{p.p}</div>
                  <span
                    className={`text-[10px] font-bold ${
                      p.s === "Released" ? "text-success" : "text-primary"
                    }`}
                  >
                    {p.s === "Released" ? "✓ " : "⏳ "}
                    {p.s}
                  </span>
                </div>
                <div className="text-sm font-extrabold text-primary shrink-0">{p.a}</div>
              </div>
            ))}
          </div>
        </section>

        <p className="text-center text-[10px] text-muted-foreground mt-6">
          Commission rate: <span className="text-foreground font-semibold">3.0%</span> · Tier 3 unlocks 2.5%
        </p>
      </main>
    </>
  );
};

export default Commission;
