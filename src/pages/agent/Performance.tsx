import { TopBar } from "@/components/shell/TopBar";
import { ChevronLeft, TrendingUp, TrendingDown, Eye, MessageSquare, CheckCircle2, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

type Period = "7d" | "30d" | "90d";

const KPI_BY_PERIOD: Record<Period, { v: string; d: string; up: boolean }[]> = {
  "7d": [
    { v: "2.1k", d: "+9%", up: true },
    { v: "62", d: "+4%", up: true },
    { v: "2", d: "+1", up: true },
    { v: "₦88M", d: "−2%", up: false },
  ],
  "30d": [
    { v: "12.4k", d: "+18%", up: true },
    { v: "284", d: "+12%", up: true },
    { v: "9", d: "+3", up: true },
    { v: "₦92M", d: "−4%", up: false },
  ],
  "90d": [
    { v: "38.6k", d: "+24%", up: true },
    { v: "812", d: "+19%", up: true },
    { v: "27", d: "+8", up: true },
    { v: "₦96M", d: "+6%", up: true },
  ],
};

const KPI_META = [
  { i: Eye, l: "Views" },
  { i: MessageSquare, l: "Leads" },
  { i: CheckCircle2, l: "Closed" },
  { i: DollarSign, l: "Avg deal" },
];

const funnel = [
  { l: "Views", v: 12400, c: "bg-primary" },
  { l: "Inquiries", v: 1840, c: "bg-primary/80" },
  { l: "Inspections", v: 412, c: "bg-primary/60" },
  { l: "Offers", v: 38, c: "bg-primary/45" },
  { l: "Closed", v: 9, c: "bg-primary/30" },
];

const topListings = [
  { t: "5-bed Lekki Phase 1", v: "3.2k views", c: "₦2.7M" },
  { t: "VI 3-bed apartment", v: "2.1k views", c: "₦1.4M" },
  { t: "GRA plot 900sqm", v: "1.8k views", c: "₦825K" },
];

const PERIOD_LABEL: Record<Period, string> = { "7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days" };

const Performance = () => {
  const maxFunnel = funnel[0].v;
  const [period, setPeriod] = useState<Period>("30d");
  const kpis = KPI_META.map((m, i) => ({ ...m, ...KPI_BY_PERIOD[period][i] }));

  return (
    <>
      <TopBar title="Performance" subtitle={PERIOD_LABEL[period]} />
      <main className="px-5 pt-4 pb-8">
        <Link
          to="/profile"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Back to profile
        </Link>

        {/* Period switch */}
        <div className="flex gap-2 mb-4">
          {(["7d", "30d", "90d"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-2 rounded-xl text-[11px] font-bold border ${
                period === p
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* KPI grid */}
        <section className="grid grid-cols-2 gap-3">
          {kpis.map((k) => {
            const Icon = k.i;
            const Trend = k.up ? TrendingUp : TrendingDown;
            return (
              <div key={k.l} className="rounded-2xl bg-card border border-border p-4">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <span
                    className={`text-[10px] font-bold flex items-center gap-0.5 ${
                      k.up ? "text-success" : "text-destructive"
                    }`}
                  >
                    <Trend className="w-3 h-3" /> {k.d}
                  </span>
                </div>
                <div className="text-xl font-extrabold mt-3">{k.v}</div>
                <div className="text-[11px] text-muted-foreground">{k.l}</div>
              </div>
            );
          })}
        </section>

        {/* Conversion funnel */}
        <section className="mt-5 rounded-2xl bg-card border border-border p-4">
          <h3 className="text-sm font-bold mb-1">Conversion funnel</h3>
          <p className="text-[11px] text-muted-foreground mb-4">
            View → Close: <span className="text-primary font-bold">0.07%</span>
          </p>
          <div className="space-y-2.5">
            {funnel.map((f, i) => {
              const w = (f.v / maxFunnel) * 100;
              const next = funnel[i + 1];
              const conv = next ? ((next.v / f.v) * 100).toFixed(1) : null;
              return (
                <div key={f.l}>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-semibold">{f.l}</span>
                    <span className="text-muted-foreground">
                      {f.v.toLocaleString()}
                      {conv && <span className="text-primary font-bold ml-2">→ {conv}%</span>}
                    </span>
                  </div>
                  <div className="h-7 rounded-lg bg-secondary overflow-hidden">
                    <div
                      className={`h-full ${f.c} rounded-lg transition-all`}
                      style={{ width: `${w}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Response time */}
        <section className="mt-4 rounded-2xl bg-card border border-border p-4">
          <h3 className="text-sm font-bold mb-3">Response quality</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-2xl font-extrabold text-primary">12m</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Avg reply</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-success">98%</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Reply rate</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold">4.9</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Rating</div>
            </div>
          </div>
        </section>

        {/* Top listings */}
        <section className="mt-4 rounded-2xl bg-card border border-border p-4">
          <h3 className="text-sm font-bold mb-3">Top performers</h3>
          <div className="space-y-2.5">
            {topListings.map((l, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-xs font-extrabold text-primary">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{l.t}</div>
                  <div className="text-[10px] text-muted-foreground">{l.v}</div>
                </div>
                <div className="text-xs font-bold text-success">{l.c}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
};

export default Performance;
