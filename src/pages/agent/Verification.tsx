import { TopBar } from "@/components/shell/TopBar";
import { ChevronLeft, Upload, Check, Clock, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const tiers = [
  { n: "Tier 1", l: "Identity", done: true },
  { n: "Tier 2", l: "Professional", done: true, current: true },
  { n: "Tier 3", l: "Premium", done: false },
];

const docs = [
  { e: "🪪", l: "Government ID", s: "approved", note: "NIN verified · Mar 2024" },
  { e: "🤳", l: "Selfie liveness", s: "approved", note: "Match score 99%" },
  { e: "📜", l: "REDAN certificate", s: "approved", note: "Valid till 2026" },
  { e: "🏢", l: "Office address proof", s: "review", note: "Reviewing · ~24h" },
  { e: "💼", l: "Tax ID (TIN)", s: "missing", note: "Required for Tier 3" },
  { e: "🎓", l: "Real-estate license", s: "missing", note: "Optional · boosts trust" },
];

const statusMap = {
  approved: { c: "bg-success/15 text-success border-success/30", i: Check, l: "Approved" },
  review: { c: "bg-info/15 text-info border-info/30", i: Clock, l: "In review" },
  missing: { c: "bg-secondary text-muted-foreground border-border", i: AlertCircle, l: "Missing" },
} as const;

const Verification = () => {
  const score = 78;
  const radius = 56;
  const circ = 2 * Math.PI * radius;
  const dash = (score / 100) * circ;

  return (
    <>
      <TopBar title="Verification" subtitle="Build buyer trust" />
      <main className="px-5 pt-4 pb-8">
        <Link
          to="/profile"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Back to profile
        </Link>

        {/* Score ring */}
        <section className="rounded-3xl bg-card border border-border p-5 flex items-center gap-5">
          <div className="relative w-32 h-32 shrink-0">
            <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
              <circle cx="64" cy="64" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
              <circle
                cx="64"
                cy="64"
                r={radius}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circ}`}
                className="transition-all duration-700"
                style={{ filter: "drop-shadow(0 0 8px hsl(var(--primary) / 0.5))" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-3xl font-extrabold text-primary">{score}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Trust score</div>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <span className="inline-block px-2 py-0.5 rounded-full bg-success/15 border border-success/30 text-[10px] font-bold text-success">
              ✓ Tier 2 active
            </span>
            <p className="mt-2 text-sm font-semibold leading-snug">
              You're <span className="text-primary">2 documents</span> away from Tier 3.
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Tier 3 unlocks lower commission & priority placement.
            </p>
          </div>
        </section>

        {/* Tier ladder */}
        <section className="mt-4 rounded-2xl bg-card border border-border p-4">
          <div className="flex items-center justify-between">
            {tiers.map((t, i) => (
              <div key={t.n} className="flex flex-col items-center flex-1 relative">
                {i > 0 && (
                  <div
                    className={`absolute right-1/2 top-4 w-full h-0.5 ${
                      tiers[i - 1].done ? "bg-primary" : "bg-border"
                    }`}
                  />
                )}
                <div
                  className={`relative w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                    t.done
                      ? "bg-primary text-primary-foreground border-primary"
                      : t.current
                      ? "bg-primary/20 border-primary text-primary"
                      : "bg-secondary border-border text-muted-foreground"
                  }`}
                >
                  {t.done ? "✓" : i + 1}
                </div>
                <div className="text-[10px] font-bold mt-1.5">{t.n}</div>
                <div className="text-[9px] text-muted-foreground">{t.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Documents */}
        <section className="mt-5">
          <h3 className="text-sm font-bold mb-3">Documents</h3>
          <div className="space-y-2">
            {docs.map((d) => {
              const meta = statusMap[d.s as keyof typeof statusMap];
              const Icon = meta.i;
              return (
                <div
                  key={d.l}
                  className="flex items-center gap-3 rounded-2xl bg-card border border-border p-3.5"
                >
                  <div className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center text-lg shrink-0">
                    {d.e}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{d.l}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{d.note}</div>
                  </div>
                  {d.s === "missing" ? (
                    <button
                      onClick={() => toast.success(`Upload flow for ${d.l}`)}
                      className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center gap-1"
                    >
                      <Upload className="w-3 h-3" /> Upload
                    </button>
                  ) : (
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded-full border flex items-center gap-1 ${meta.c}`}
                    >
                      <Icon className="w-3 h-3" /> {meta.l}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <p className="text-center text-[10px] text-muted-foreground mt-6">
          🔒 Documents are encrypted and reviewed by our compliance team within 48h.
        </p>
      </main>
    </>
  );
};

export default Verification;
