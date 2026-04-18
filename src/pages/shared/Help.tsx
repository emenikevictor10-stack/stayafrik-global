import { TopBar } from "@/components/shell/TopBar";
import { ChevronLeft, Search, MessageCircle, Phone, Mail, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "sonner";

const topicsClient = [
  { e: "🔐", l: "How escrow works", c: "Secure your funds" },
  { e: "🏠", l: "Booking & inspection", c: "Schedule visits" },
  { e: "💳", l: "Payments & refunds", c: "Methods we accept" },
  { e: "🛡️", l: "Verification & trust", c: "What ✓ means" },
];

const topicsAgent = [
  { e: "📜", l: "Verification tiers", c: "Unlock Tier 3 perks" },
  { e: "💼", l: "Commission & payouts", c: "Rates & timing" },
  { e: "📈", l: "Boost your listings", c: "Top placement tips" },
  { e: "🛡️", l: "Trust & safety", c: "Stay compliant" },
];

const faqs = [
  {
    q: "How long does escrow take to release?",
    a: "Funds are released within 24h after both parties sign off on document handover and inspection.",
  },
  {
    q: "What documents are required to verify a listing?",
    a: "Title deed (or C of O), survey plan, government ID of the seller, and a signed authorization to list.",
  },
  {
    q: "Can I withdraw earnings to a foreign bank?",
    a: "Yes. We support payouts in NGN, USD, GBP and EUR via Wise. Currency selection is in Profile → Language & currency.",
  },
  {
    q: "What happens if a deal falls through?",
    a: "Escrow funds are returned in full to the buyer minus any agreed inspection fees. No commission is charged on cancelled deals.",
  },
];

const Help = () => {
  const { role } = useRole();
  const topics = role === "agent" ? topicsAgent : topicsClient;
  const [open, setOpen] = useState<number | null>(0);

  return (
    <>
      <TopBar title="Help & support" subtitle="We're here 24/7" />
      <main className="px-5 pt-4 pb-8">
        <Link
          to="/profile"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Back to profile
        </Link>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search help articles…"
            className="w-full bg-card border border-border rounded-2xl pl-10 pr-4 py-3.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
        </div>

        {/* Topics */}
        <section className="mt-5">
          <h3 className="text-sm font-bold mb-3">Browse topics</h3>
          <div className="grid grid-cols-2 gap-2.5">
            {topics.map((t) => (
              <button
                key={t.l}
                onClick={() => toast.success(`Opening ${t.l}`)}
                className="text-left rounded-2xl bg-card border border-border p-3.5 hover:border-primary/50"
              >
                <div className="text-2xl mb-2">{t.e}</div>
                <div className="text-sm font-semibold leading-tight">{t.l}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{t.c}</div>
              </button>
            ))}
          </div>
        </section>

        {/* FAQs */}
        <section className="mt-5">
          <h3 className="text-sm font-bold mb-3">Top questions</h3>
          <div className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
            {faqs.map((f, i) => (
              <div key={i}>
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                >
                  <span className="text-sm font-semibold flex-1">{f.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${
                      open === i ? "rotate-180 text-primary" : ""
                    }`}
                  />
                </button>
                {open === i && (
                  <div className="px-4 pb-4 text-xs text-muted-foreground leading-relaxed animate-fade-in">
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Contact channels */}
        <section className="mt-5">
          <h3 className="text-sm font-bold mb-3">Contact us</h3>
          <div className="grid grid-cols-3 gap-2.5">
            <button
              onClick={() => toast.success("Opening live chat")}
              className="rounded-2xl bg-primary text-primary-foreground p-4 flex flex-col items-center gap-1.5 shadow-glow"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-[11px] font-bold">Live chat</span>
              <span className="text-[9px] opacity-80">~2 min</span>
            </button>
            <button
              onClick={() => toast.success("Calling support")}
              className="rounded-2xl bg-card border border-border p-4 flex flex-col items-center gap-1.5"
            >
              <Phone className="w-5 h-5 text-primary" />
              <span className="text-[11px] font-bold">Call</span>
              <span className="text-[9px] text-muted-foreground">24/7</span>
            </button>
            <button
              onClick={() => toast.success("Opening email")}
              className="rounded-2xl bg-card border border-border p-4 flex flex-col items-center gap-1.5"
            >
              <Mail className="w-5 h-5 text-primary" />
              <span className="text-[11px] font-bold">Email</span>
              <span className="text-[9px] text-muted-foreground">~4h</span>
            </button>
          </div>
        </section>

        <div className="mt-6 rounded-2xl bg-card border border-border p-4 flex items-center gap-3">
          <div className="text-2xl">🛟</div>
          <div className="flex-1">
            <div className="text-sm font-bold">Emergency dispute?</div>
            <div className="text-[11px] text-muted-foreground">
              For escrow or fraud issues, tap to escalate immediately.
            </div>
          </div>
          <button
            onClick={() => toast.success("Escalation team notified")}
            className="px-3 py-1.5 rounded-full bg-destructive/15 border border-destructive/40 text-destructive text-[11px] font-bold"
          >
            Escalate
          </button>
        </div>

        <p className="text-center text-[10px] text-muted-foreground mt-6">
          Stayafrik Support · Lagos, Accra, Nairobi 🌍
        </p>
      </main>
    </>
  );
};

export default Help;
