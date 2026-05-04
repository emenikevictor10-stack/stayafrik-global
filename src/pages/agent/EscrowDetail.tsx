import { TopBar } from "@/components/shell/TopBar";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ChevronLeft, ShieldCheck, Download, FileText, MessageSquare } from "lucide-react";
import { toast } from "sonner";

const ESCROWS: Record<string, any> = {
  "SA-ESC-9912": {
    code: "SA-ESC-9912", prop: "5-Bed Detached, Lekki Phase 1", buyer: "Tobi Adeyemi",
    buyerEmoji: "🧑🏾", amount: 185000000, step: 3, status: "Funds held",
    opened: "Apr 09, 2026", funded: "Apr 11, 2026",
  },
  "SA-ESC-9874": {
    code: "SA-ESC-9874", prop: "3-Bed Apartment, V.I", buyer: "Adaeze O.",
    buyerEmoji: "🙋🏾‍♀️", amount: 95000000, step: 4, status: "Documents in transit",
    opened: "Mar 28, 2026", funded: "Mar 30, 2026",
  },
  "SA-ESC-9810": {
    code: "SA-ESC-9810", prop: "Land 900sqm, GRA Phase 2", buyer: "Ifeanyi C.",
    buyerEmoji: "👨🏾", amount: 55000000, step: 5, status: "Released ✓",
    opened: "Mar 12, 2026", funded: "Mar 15, 2026",
  },
};

const STEPS = [
  { e: "💳", l: "Funded", d: "Buyer transferred funds to escrow" },
  { e: "🛡️", l: "Verified", d: "PropertyVerify™ confirmed title" },
  { e: "🔐", l: "Held", d: "Funds locked pending handover" },
  { e: "📦", l: "In transit", d: "Documents being delivered" },
  { e: "✅", l: "Released", d: "Funds released to seller" },
];

const EscrowDetail = () => {
  const { code } = useParams();
  const nav = useNavigate();
  const e = ESCROWS[code || ""] || Object.values(ESCROWS)[0];
  const fmt = (n: number) => "₦" + n.toLocaleString();
  const fee = Math.round(e.amount * 0.025);
  const net = e.amount - fee;

  return (
    <>
      <TopBar title="Escrow details" subtitle={e.code} />
      <main className="px-5 pt-4 pb-8">
        <Link to="/escrow" className="inline-flex items-center gap-1 text-xs text-muted-foreground mb-4">
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </Link>

        {/* Hero */}
        <section className="rounded-3xl bg-gradient-to-br from-primary/30 via-primary/10 to-card border border-primary/30 p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">PropertyEscrow™</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-3">Total in escrow</div>
          <div className="text-3xl font-extrabold text-primary mt-1">{fmt(e.amount)}</div>
          <div className="text-xs text-muted-foreground mt-1">{e.prop}</div>
        </section>

        {/* Buyer */}
        <section className="mt-4 rounded-2xl bg-card border border-border p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-2xl">{e.buyerEmoji}</div>
          <div className="flex-1">
            <div className="text-[11px] text-muted-foreground">Buyer</div>
            <div className="text-sm font-bold">{e.buyer}</div>
          </div>
          <button onClick={() => nav(`/messages/${e.buyer.toLowerCase().replace(/\s+/g, "-")}`)}
            className="px-3 py-2 rounded-full bg-primary/10 border border-primary/30 text-xs font-bold text-primary flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5" /> Chat
          </button>
        </section>

        {/* Timeline */}
        <section className="mt-4 rounded-2xl bg-card border border-border p-4">
          <h3 className="text-sm font-bold mb-4">Transaction timeline</h3>
          <div className="space-y-4">
            {STEPS.map((s, i) => {
              const done = i < e.step;
              const active = i === e.step - 1;
              return (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm ${
                      done ? "bg-primary border-primary" : active ? "bg-primary/20 border-primary" : "bg-secondary border-border"
                    }`}>
                      {s.e}
                    </div>
                    {i < STEPS.length - 1 && <div className={`flex-1 w-0.5 my-1 ${done ? "bg-primary" : "bg-border"}`} style={{ minHeight: "24px" }} />}
                  </div>
                  <div className="pb-3 flex-1">
                    <div className={`text-sm font-bold ${done || active ? "text-foreground" : "text-muted-foreground"}`}>{s.l}</div>
                    <div className="text-[11px] text-muted-foreground">{s.d}</div>
                    {(done || active) && <div className="text-[10px] text-primary font-semibold mt-0.5">{i === 0 ? e.funded : i === 1 ? "Apr 12" : "—"}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Breakdown */}
        <section className="mt-4 rounded-2xl bg-card border border-border p-4">
          <h3 className="text-sm font-bold mb-3">Payment breakdown</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Property amount</span><span className="font-semibold">{fmt(e.amount)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Stayafrik fee (2.5%)</span><span className="font-semibold">−{fmt(fee)}</span></div>
            <div className="border-t border-border pt-2 flex justify-between font-extrabold">
              <span>Net to you</span><span className="text-primary">{fmt(net)}</span>
            </div>
          </div>
        </section>

        {/* Documents */}
        <section className="mt-4 rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
          {[
            { l: "Sale agreement.pdf", s: "2.4 MB" },
            { l: "Title deed (C of O).pdf", s: "1.1 MB" },
            { l: "Buyer ID verification.pdf", s: "640 KB" },
          ].map((d) => (
            <div key={d.l} className="flex items-center gap-3 px-4 py-3.5">
              <FileText className="w-5 h-5 text-primary" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{d.l}</div>
                <div className="text-[10px] text-muted-foreground">{d.s}</div>
              </div>
              <button onClick={() => toast.success("Downloaded")}><Download className="w-4 h-4 text-muted-foreground" /></button>
            </div>
          ))}
        </section>

        {e.step < 5 && (
          <button onClick={() => toast.success("Marked as ready for release")}
            className="mt-6 w-full rounded-2xl bg-primary text-primary-foreground py-3.5 font-bold text-sm shadow-glow">
            Mark documents handed over
          </button>
        )}
      </main>
    </>
  );
};

export default EscrowDetail;
