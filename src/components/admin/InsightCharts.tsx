import { useState, type ReactNode } from "react";

/** Plain-SVG charts for Admin → Insights. Every chart has a hover tooltip and a Table toggle (PRD §5). */
const tbtn = "min-h-9 px-3 rounded-lg border border-border text-[13px] font-semibold";

export const ChartCard = ({ title, table, children, extra }: { title: string; table: { head: string[]; rows: (string | number)[][] }; children: ReactNode; extra?: ReactNode }) => {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        <button type="button" className={tbtn} onClick={() => setAsTable((v) => !v)}>{asTable ? "Chart" : "Table"}</button>
      </div>
      {extra}
      {asTable ? (
        <div className="overflow-x-auto max-h-72">
          <table className="w-full text-[13px]">
            <thead><tr className="text-left text-muted-foreground">{table.head.map((h, i) => <th key={h} className={`py-1 ${i ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
            <tbody>{table.rows.map((r, i) => <tr key={i} className="border-t border-border">{r.map((c, j) => <td key={j} className={`py-1 ${j ? "text-right" : ""}`}>{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      ) : children}
    </section>
  );
};

/** Line with soft fill for the current period, muted grey line for the period before, crosshair tooltip. */
export const LineCompare = ({ labels, cur, prev, fmt }: { labels: string[]; cur: number[]; prev: number[]; fmt: (n: number) => string }) => {
  const [hover, setHover] = useState<number | null>(null);
  const W = 600, H = 180, n = Math.max(1, labels.length - 1);
  const max = Math.max(1, ...cur, ...prev);
  const x = (i: number) => (i / n) * W;
  const y = (v: number) => H - (v / max) * (H - 10);
  const path = (vals: number[]) => vals.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-48" role="img" aria-label="Day by day compared with the period before"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHover(Math.round(((e.clientX - r.left) / r.width) * n)); }}>
        {[0.25, 0.5, 0.75].map((g) => <line key={g} x1={0} x2={W} y1={H * g} y2={H * g} className="stroke-border" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />)}
        <path d={`${path(cur)} L${W},${H} L0,${H} Z`} className="fill-chart-1" fillOpacity={0.12} />
        <path d={path(prev)} fill="none" className="stroke-muted-foreground/50" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        <path d={path(cur)} fill="none" className="stroke-chart-1" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={0} y2={H} className="stroke-foreground/40" strokeWidth={1} vectorEffect="non-scaling-stroke" />}
      </svg>
      {hover !== null && labels[hover] && (
        <div className="absolute top-0 rounded-lg border border-border bg-popover px-2 py-1 text-xs shadow pointer-events-none" style={{ left: `min(${(hover / n) * 100}%, calc(100% - 140px))` }}>
          <p className="font-semibold">{labels[hover]}</p>
          <p><span className="inline-block w-2 h-2 rounded-full bg-chart-1 mr-1" />This period {fmt(cur[hover] || 0)}</p>
          <p className="text-muted-foreground"><span className="inline-block w-2 h-2 rounded-full bg-muted-foreground/50 mr-1" />Before {fmt(prev[hover] || 0)}</p>
        </div>
      )}
      <div className="flex gap-4 text-xs text-muted-foreground mt-1">
        <span><span className="inline-block w-3 h-0.5 bg-chart-1 align-middle mr-1" />This period</span>
        <span><span className="inline-block w-3 h-0.5 bg-muted-foreground/50 align-middle mr-1" />Period before</span>
      </div>
    </div>
  );
};

/** Column chart: bars at most 24px wide with rounded tops; optional highlighted bar. */
export const Columns = ({ data, highlight, fmt = String }: { data: { label: string; n: number }[]; highlight?: number; fmt?: (n: number) => string }) => {
  const max = Math.max(1, ...data.map((d) => d.n));
  return (
    <div className="flex items-end gap-2 h-40 pt-4">
      {data.map((d, i) => (
        <div key={d.label} className="flex-1 flex flex-col items-center justify-end h-full group relative" title={`${d.label}: ${fmt(d.n)}`}>
          <span className="absolute -top-1 text-xs opacity-0 group-hover:opacity-100">{fmt(d.n)}</span>
          <div className={`w-full max-w-6 rounded-t ${i === highlight ? "bg-chart-2" : "bg-chart-1"}`} style={{ height: `${(d.n / max) * 100}%`, minHeight: d.n ? 2 : 0 }} />
          <span className="text-xs text-muted-foreground mt-1 whitespace-nowrap">{d.label}</span>
        </div>
      ))}
    </div>
  );
};

/** Ranked horizontal bars. */
export const RankBars = ({ rows }: { rows: { label: ReactNode; key: string; value: number; text: string; sub: string }[] }) => {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="text-[13px] text-muted-foreground">Nothing sold in this period.</p>;
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.key} title={`${r.text} · ${r.sub}`}>
          <div className="flex justify-between text-[13px] gap-2"><span className="truncate">{r.label}</span><span className="font-semibold">{r.text}</span></div>
          <div className="h-2 rounded bg-secondary mt-1"><div className="h-2 rounded bg-chart-1" style={{ width: `${(r.value / max) * 100}%` }} /></div>
          <p className="text-xs text-muted-foreground mt-0.5">{r.sub}</p>
        </li>
      ))}
    </ul>
  );
};

/** Two-part split bar. */
export const SplitBar = ({ parts }: { parts: { label: string; value: number; cls: string; text: string }[] }) => {
  const total = parts.reduce((s, p) => s + p.value, 0);
  return (
    <div>
      <div className="flex h-3 rounded overflow-hidden bg-secondary">
        {total > 0 && parts.map((p) => <div key={p.label} className={p.cls} style={{ width: `${(p.value / total) * 100}%` }} title={`${p.label}: ${p.text}`} />)}
      </div>
      <ul className="mt-2 space-y-1 text-[13px]">
        {parts.map((p) => <li key={p.label} className="flex justify-between"><span><span className={`inline-block w-2 h-2 rounded-full mr-1 ${p.cls}`} />{p.label}</span><span className="font-semibold">{p.text}</span></li>)}
      </ul>
    </div>
  );
};

/** Tiny sparkline. */
export const Spark = ({ vals }: { vals: number[] }) => {
  const max = Math.max(1, ...vals), n = Math.max(1, vals.length - 1);
  return (
    <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="w-full h-6" aria-hidden>
      <path d={vals.map((v, i) => `${i ? "L" : "M"}${(i / n) * 100},${24 - (v / max) * 22}`).join(" ")} fill="none" className="stroke-chart-2" strokeWidth={2} vectorEffect="non-scaling-stroke" />
    </svg>
  );
};
