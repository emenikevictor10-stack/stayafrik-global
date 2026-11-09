import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ErrorState, ListSkeleton, Tabs } from "@/ui/kit";
import { ChartCard, Columns, LineCompare, RankBars, SplitBar, Spark } from "@/components/admin/InsightCharts";
import { changeText, periodRange, share, type PeriodKey } from "@/lib/insights";

const naira = (n: number) => "₦" + Math.round(Number(n || 0)).toLocaleString();
const num = (n: number, dp = 0) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: dp });
const pct = (n: number) => `${Math.round(Number(n || 0) * 100)}%`;

type Day = { day: string; value: number; value_p: number; received: number; received_p: number; confirmed: number; confirmed_p: number; nights: number; nights_p: number; cancelled: number; started: number; signups: number };
type Head = { value: number; received: number; confirmed: number; nights: number };
type Tiles = { nightly: number; avg_booking: number; avg_stay: number; lead_days: number; cancelled_share: number; repeat: number };
type Bar = { label: string; n: number };
type Rank = { label: string; ref?: string; source?: string; value: number; bookings: number; nights: number };
type Ins = {
  from: string; to: string;
  headline: { current: Head; previous: Head; days: Day[] };
  funnel: { started: number; held: number; reserved: number; paid: number; confirmed: number };
  earnings: { fees: number; markup: number; addons: number; refunds: number; prev_total: number };
  pay_mix: { bank: number; card: number; bank_value: number; card_value: number; avg: number };
  tiles: { current: Tiles; previous: Tiles };
  stay_length: Bar[]; checkin_dow: Bar[]; lead_time: Bar[];
  next30: { day: string; in_house: number; arrivals: number }[]; next30_value: number;
  top_areas: Rank[]; top_stays: Rank[];
  by_source: Record<string, { value: number; earnings: number; bookings: number }>;
  guests: { signups: number; signups_prev: number; bookers: number; total_users: number };
};

const METRICS = [
  { key: "value", label: "Booking value", money: true },
  { key: "received", label: "Money received", money: true },
  { key: "confirmed", label: "Bookings confirmed", money: false },
  { key: "nights", label: "Nights sold", money: false },
] as const;
type MetricKey = (typeof METRICS)[number]["key"];

const short = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-NG", { day: "numeric", month: "short", timeZone: "UTC" });

/** /admin/insights — PRD §5 / Prompt 17. A booking counts as sold on the day it was confirmed (Lagos time). */
const AdminInsights = () => {
  const [period, setPeriod] = useState<PeriodKey>("30");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [metric, setMetric] = useState<MetricKey>("value");
  const [d, setD] = useState<Ins | null>(null);
  const [err, setErr] = useState(false);
  const range = useMemo(() => periodRange(period, new Date(), custom), [period, custom]);

  const load = useCallback(async () => {
    if (!range) return;
    setErr(false); setD(null);
    const { data, error } = await supabase.rpc("admin_insights", { _from: range.from, _to: range.to });
    if (error) return setErr(true);
    setD(data as unknown as Ins);
  }, [range]);
  useEffect(() => { void load(); }, [load]);

  const m = METRICS.find((x) => x.key === metric)!;
  const fmt = (n: number) => (m.money ? naira(n) : num(n));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Insights</h1>
          {range && <p className="text-xs text-muted-foreground">{short(range.from)} – {short(range.to)}, compared with the period before · Lagos time</p>}
        </div>
        <Tabs value={period} onChange={(v) => setPeriod(v as PeriodKey)} tabs={[
          { value: "7", label: "7 days" }, { value: "30", label: "30 days" }, { value: "90", label: "90 days" },
          { value: "month", label: "This month" }, { value: "year", label: "This year" }, { value: "custom", label: "Custom" }]} />
      </div>
      {period === "custom" && (
        <div className="flex flex-wrap items-end gap-2 text-[13px]">
          <label>From<input type="date" aria-label="From" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} className="block h-11 rounded-lg border border-border bg-background px-3" /></label>
          <label>To<input type="date" aria-label="To" value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} className="block h-11 rounded-lg border border-border bg-background px-3" /></label>
          {!range && <p className="text-muted-foreground pb-3">Pick a start and end date (start first).</p>}
        </div>
      )}

      {!range ? null : err ? <ErrorState onRetry={load} /> : !d ? <ListSkeleton /> : (
        <>
          {/* 1. Headline */}
          <ChartCard title="Headline" table={{ head: ["Day", "This period", "Period before"], rows: d.headline.days.map((x) => [x.day, fmt(x[metric]), fmt(x[`${metric}_p` as keyof Day] as number)]) }}
            extra={
              <div role="tablist" className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
                {METRICS.map((x) => (
                  <button key={x.key} role="tab" aria-selected={metric === x.key} onClick={() => setMetric(x.key)}
                    className={`text-left rounded-lg border p-3 ${metric === x.key ? "border-primary bg-primary/5" : "border-border"}`}>
                    <p className="text-xs text-muted-foreground">{x.label}</p>
                    <p className="text-lg font-semibold">{x.money ? naira(d.headline.current[x.key]) : num(d.headline.current[x.key])}</p>
                    <p className="text-xs text-muted-foreground">{changeText(d.headline.current[x.key], d.headline.previous[x.key])} vs before</p>
                  </button>
                ))}
              </div>
            }>
            <LineCompare labels={d.headline.days.map((x) => short(x.day))} cur={d.headline.days.map((x) => Number(x[metric]))}
              prev={d.headline.days.map((x) => Number(x[`${metric}_p` as keyof Day]))} fmt={fmt} />
          </ChartCard>

          {/* 2. Funnel, earnings, pay mix */}
          <div className="grid gap-4 lg:grid-cols-3">
            <ChartCard title="Booking funnel" table={{ head: ["Step", "Bookings", "Share of started"], rows: ([["Started", d.funnel.started], ["Dates held", d.funnel.held], ["Reserved", d.funnel.reserved], ["Paid", d.funnel.paid], ["Confirmed", d.funnel.confirmed]] as [string, number][]).map(([l, n]) => [l, n, `${share(n, d.funnel.started)}%`]) }}>
              <RankBars rows={([["Started", d.funnel.started], ["Dates held", d.funnel.held], ["Reserved", d.funnel.reserved], ["Paid", d.funnel.paid], ["Confirmed", d.funnel.confirmed]] as [string, number][])
                .map(([l, n]) => ({ key: l, label: l, value: n, text: num(n), sub: `${share(n, d.funnel.started)}% of started` }))} />
            </ChartCard>
            <ChartCard title="Stay earnings" table={{ head: ["Part", "Amount"], rows: [["Service fees (own stays)", naira(d.earnings.fees)], ["Markup (partner stays)", naira(d.earnings.markup)], ["Extras", naira(d.earnings.addons)], ["Refunds paid", naira(d.earnings.refunds)]] }}>
              {(() => { const total = d.earnings.fees + d.earnings.markup + d.earnings.addons; return (
                <>
                  <p className="text-2xl font-semibold">{naira(total)}</p>
                  <p className="text-xs text-muted-foreground mb-3">{changeText(total, d.earnings.prev_total)} vs before · exact, from what's saved on each booking</p>
                  <SplitBar parts={[
                    { label: "Service fees", value: d.earnings.fees, cls: "bg-chart-1", text: naira(d.earnings.fees) },
                    { label: "Partner markup", value: d.earnings.markup, cls: "bg-chart-2", text: naira(d.earnings.markup) },
                    { label: "Extras", value: d.earnings.addons, cls: "bg-muted-foreground/50", text: naira(d.earnings.addons) }]} />
                  <p className="text-[13px] mt-2 flex justify-between"><span>Refunds paid</span><span className="font-semibold">{naira(d.earnings.refunds)}</span></p>
                </>); })()}
            </ChartCard>
            <ChartCard title="How guests pay" table={{ head: ["Method", "Payments", "Value"], rows: [["Bank transfer", d.pay_mix.bank, naira(d.pay_mix.bank_value)], ["Card", d.pay_mix.card, naira(d.pay_mix.card_value)]] }}>
              <SplitBar parts={[
                { label: "Bank transfer", value: d.pay_mix.bank, cls: "bg-chart-1", text: `${d.pay_mix.bank} · ${naira(d.pay_mix.bank_value)}` },
                { label: "Card", value: d.pay_mix.card, cls: "bg-chart-2", text: `${d.pay_mix.card} · ${naira(d.pay_mix.card_value)}` }]} />
              <p className="text-[13px] mt-2 flex justify-between"><span>Average payment</span><span className="font-semibold">{naira(d.pay_mix.avg)}</span></p>
            </ChartCard>
          </div>

          {/* 3. Tiles */}
          <div className="grid gap-2 grid-cols-2 lg:grid-cols-6">
            {([
              ["Average nightly rate", "nightly", naira], ["Average booking", "avg_booking", naira], ["Average stay", "avg_stay", (n: number) => `${num(n, 1)} nights`],
              ["Days booked ahead", "lead_days", (n: number) => num(n, 1)], ["Cancelled share", "cancelled_share", pct], ["Repeat guests", "repeat", num],
            ] as [string, keyof Tiles, (n: number) => string][]).map(([label, k, f]) => (
              <div key={k} className="rounded-xl border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-lg font-semibold">{f(d.tiles.current[k])}</p>
                <p className="text-xs text-muted-foreground">{changeText(Number(d.tiles.current[k]), Number(d.tiles.previous[k]))} vs before</p>
                {k === "cancelled_share" && <Spark vals={d.headline.days.map((x) => x.cancelled)} />}
              </div>
            ))}
          </div>

          {/* 4. Column charts */}
          <div className="grid gap-4 lg:grid-cols-3">
            <ChartCard title="Length of stay (nights)" table={{ head: ["Nights", "Bookings"], rows: d.stay_length.map((x) => [x.label, x.n]) }}><Columns data={d.stay_length} /></ChartCard>
            {(() => { const top = d.checkin_dow.reduce((bi, x, i, a) => (x.n > a[bi].n ? i : bi), 0); return (
              <ChartCard title="Check-in day" table={{ head: ["Day", "Bookings"], rows: d.checkin_dow.map((x) => [x.label, x.n]) }}>
                <Columns data={d.checkin_dow} highlight={d.checkin_dow[top]?.n ? top : undefined} />
              </ChartCard>); })()}
            <ChartCard title="How far ahead guests book" table={{ head: ["Booked ahead", "Bookings"], rows: d.lead_time.map((x) => [x.label, x.n]) }}><Columns data={d.lead_time.map((x, i) => ({ n: x.n, label: ["0d", "1–3d", "4–7d", "1–2w", "2–4w", "30d+"][i] ?? x.label }))} /></ChartCard>
          </div>

          {/* 5. Next 30 days */}
          {(() => { const busiest = d.next30.reduce((b, x) => (x.in_house > b.in_house ? x : b), d.next30[0] || { day: "", in_house: 0, arrivals: 0 }); return (
            <ChartCard title="Next 30 days on the books" table={{ head: ["Night", "Stays in house", "Arrivals"], rows: d.next30.map((x) => [x.day, x.in_house, x.arrivals]) }}
              extra={<p className="text-[13px] mb-2">Value already booked <b>{naira(d.next30_value)}</b>{busiest?.in_house ? <> · Busiest night <b>{short(busiest.day)}</b> ({busiest.in_house} stays)</> : null}</p>}>
              <div className="flex items-end gap-0.5 h-32">
                {d.next30.map((x) => { const max = Math.max(1, ...d.next30.map((y) => y.in_house)); return (
                  <div key={x.day} className="flex-1 h-full flex items-end" title={`${short(x.day)}: ${x.in_house} in house, ${x.arrivals} arriving`}>
                    <div className="w-full max-w-6 mx-auto rounded-t bg-chart-1" style={{ height: `${(x.in_house / max) * 100}%`, minHeight: x.in_house ? 2 : 0 }} />
                  </div>); })}
              </div>
            </ChartCard>); })()}

          {/* 6. Top areas, top stays, source split */}
          <div className="grid gap-4 lg:grid-cols-3">
            <ChartCard title="Top areas" table={{ head: ["Area", "Value", "Bookings", "Nights"], rows: d.top_areas.map((x) => [x.label, naira(x.value), x.bookings, x.nights]) }}>
              <RankBars rows={d.top_areas.map((x) => ({ key: x.label, label: x.label, value: x.value, text: naira(x.value), sub: `${x.bookings} bookings · ${x.nights} nights` }))} />
            </ChartCard>
            <ChartCard title="Top stays" table={{ head: ["Stay", "Value", "Bookings", "Nights"], rows: d.top_stays.map((x) => [x.label, naira(x.value), x.bookings, x.nights]) }}>
              <RankBars rows={d.top_stays.map((x) => ({ key: x.ref || x.label, value: x.value, text: naira(x.value), sub: `${x.bookings} bookings · ${x.nights} nights`,
                label: x.ref ? <Link className="hover:underline" target="_blank" to={`/property/${x.source === "rayprop" && !x.ref.startsWith("rp_") ? "rp_" + x.ref : x.ref}`}>{x.label}</Link> : x.label }))} />
            </ChartCard>
            <ChartCard title="Partner vs own stays" table={{ head: ["Source", "Value", "Earnings", "Bookings"], rows: Object.entries(d.by_source).map(([k, v]) => [k === "rayprop" ? "Partner" : "Own stays", naira(v.value), naira(v.earnings), v.bookings]) }}>
              <p className="text-xs text-muted-foreground mb-1">Booking value</p>
              <SplitBar parts={[
                { label: "Own stays", value: d.by_source.stayglobal?.value || 0, cls: "bg-chart-1", text: naira(d.by_source.stayglobal?.value || 0) },
                { label: "Partner", value: d.by_source.rayprop?.value || 0, cls: "bg-chart-2", text: naira(d.by_source.rayprop?.value || 0) }]} />
              <p className="text-xs text-muted-foreground mt-3 mb-1">Earnings</p>
              <SplitBar parts={[
                { label: "Own stays", value: d.by_source.stayglobal?.earnings || 0, cls: "bg-chart-1", text: naira(d.by_source.stayglobal?.earnings || 0) },
                { label: "Partner", value: d.by_source.rayprop?.earnings || 0, cls: "bg-chart-2", text: naira(d.by_source.rayprop?.earnings || 0) }]} />
            </ChartCard>
          </div>

          {/* 7. Sign-ups and guests */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ChartCard title="New sign-ups by day" table={{ head: ["Day", "Sign-ups"], rows: d.headline.days.map((x) => [x.day, x.signups]) }}>
                <Columns data={d.headline.days.map((x) => ({ label: d.headline.days.length <= 14 ? short(x.day) : "", n: x.signups }))} />
              </ChartCard>
            </div>
            <section className="rounded-xl border border-border bg-card p-4 text-[13px] space-y-2">
              <h2 className="text-[15px] font-semibold">Guests</h2>
              <p className="flex justify-between"><span>New sign-ups</span><b>{d.guests.signups} <span className="font-normal text-muted-foreground">({changeText(d.guests.signups, d.guests.signups_prev)})</span></b></p>
              <p className="flex justify-between"><span>Guests who booked</span><b>{d.guests.bookers}</b></p>
              <p className="flex justify-between"><span>Repeat guests</span><b>{d.tiles.current.repeat}</b></p>
              <p className="flex justify-between"><span>All accounts</span><b>{d.guests.total_users}</b></p>
            </section>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminInsights;
