import { TopBar } from "@/components/shell/TopBar";

const escrows = [
  {
    code: "SA-ESC-9912",
    prop: "5-Bed Detached, Lekki Phase 1",
    buyer: "Tobi Adeyemi",
    amount: "₦185,000,000",
    step: 3,
    status: "Funds held",
  },
  {
    code: "SA-ESC-9874",
    prop: "3-Bed Apartment, V.I",
    buyer: "Adaeze O.",
    amount: "₦95,000,000",
    step: 4,
    status: "Documents in transit",
  },
  {
    code: "SA-ESC-9810",
    prop: "Land 900sqm, GRA Phase 2",
    buyer: "Ifeanyi C.",
    amount: "₦55,000,000",
    step: 5,
    status: "Released ✓",
  },
];

const steps = [
  { e: "💳", l: "Funded" },
  { e: "🛡️", l: "Verified" },
  { e: "🔐", l: "Held" },
  { e: "📦", l: "In transit" },
  { e: "✅", l: "Released" },
];

const Escrow = () => {
  return (
    <>
      <TopBar title="Escrow" subtitle="Track every transaction" />
      <main className="px-5 pt-5 pb-8 space-y-4">
        {escrows.map((e) => (
          <article key={e.code} className="rounded-2xl bg-card border border-border p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-sm truncate">{e.prop}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Buyer: {e.buyer} · <span className="font-mono">{e.code}</span>
                </p>
              </div>
              <div className="text-primary font-extrabold text-sm shrink-0">{e.amount}</div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              {steps.map((s, i) => {
                const done = i < e.step;
                const active = i === e.step - 1;
                return (
                  <div key={i} className="flex flex-col items-center flex-1 relative">
                    {i > 0 && (
                      <div
                        className={`absolute right-1/2 top-3.5 w-full h-0.5 ${
                          done ? "bg-primary" : "bg-border"
                        }`}
                      />
                    )}
                    <div
                      className={`relative w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs ${
                        done
                          ? "bg-primary text-primary-foreground border-primary"
                          : active
                          ? "bg-primary/20 border-primary text-primary"
                          : "bg-secondary border-border text-muted-foreground"
                      }`}
                    >
                      {s.e}
                    </div>
                    <div
                      className={`mt-1 text-[9px] font-medium ${
                        done || active ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {s.l}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span
                className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
                  e.status.includes("Released")
                    ? "bg-success/15 text-success border-success/30"
                    : e.status.includes("transit")
                    ? "bg-info/15 text-info border-info/30"
                    : "bg-primary/15 text-primary border-primary/30"
                }`}
              >
                {e.status}
              </span>
              <button className="text-[11px] font-semibold text-primary">View details →</button>
            </div>
          </article>
        ))}
      </main>
    </>
  );
};

export default Escrow;
