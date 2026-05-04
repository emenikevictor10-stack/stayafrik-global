import { useParams, useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { PROPERTIES } from "@/data/properties";
import { ChevronLeft, Calendar, Users, ShieldCheck, CreditCard, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type Step = 1 | 2 | 3 | 4;

const BookProperty = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const p = PROPERTIES.find((x) => x.id === id);
  const [step, setStep] = useState<Step>(1);
  const [checkIn, setCheckIn] = useState("2026-05-12");
  const [checkOut, setCheckOut] = useState("2026-05-15");
  const [guests, setGuests] = useState(2);
  const [paying, setPaying] = useState(false);

  if (!p) return <main className="p-8">Not found</main>;

  const nights = Math.max(
    1,
    Math.round(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
    )
  );
  const subtotal = p.priceNum * nights;
  const fees = Math.round(subtotal * 0.08);
  const total = subtotal + fees;
  const fmt = (n: number) => "₦" + n.toLocaleString();

  const next = () => setStep((s) => (s < 4 ? ((s + 1) as Step) : s));
  const back = () => (step === 1 ? navigate(-1) : setStep((s) => ((s - 1) as Step)));

  const pay = () => {
    setPaying(true);
    setTimeout(() => {
      setPaying(false);
      setStep(4);
      toast.success("Payment confirmed via Paystack");
    }, 1600);
  };

  return (
    <main className="pb-32 min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="px-5 py-3 flex items-center gap-3">
          <button onClick={back} className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <div className="text-[11px] text-muted-foreground">Step {step} of 4</div>
            <div className="text-sm font-bold">
              {step === 1 && "When are you staying?"}
              {step === 2 && "Who's coming?"}
              {step === 3 && "Review & pay"}
              {step === 4 && "Booking confirmed"}
            </div>
          </div>
        </div>
        <div className="h-1 bg-secondary">
          <div className="h-full bg-primary transition-all" style={{ width: `${(step / 4) * 100}%` }} />
        </div>
      </header>

      <div className="px-5 pt-5">
        {/* Property summary */}
        <section className="flex gap-3 rounded-2xl bg-card border border-border p-3 mb-5">
          <img src={p.image} alt={p.title} className="w-16 h-16 rounded-xl object-cover" />
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm truncate">{p.title}</h2>
            <p className="text-[11px] text-muted-foreground truncate">📍 {p.location}</p>
            <div className="text-primary text-sm font-extrabold mt-1">{p.price}<span className="text-[10px] text-muted-foreground font-medium"> /night</span></div>
          </div>
        </section>

        {/* STEP 1 — Dates */}
        {step === 1 && (
          <section className="space-y-4">
            <div className="rounded-2xl bg-card border border-border p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">Select dates</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[11px] text-muted-foreground">Check-in</span>
                  <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-secondary border border-border px-3 py-2.5 text-sm" />
                </label>
                <label className="block">
                  <span className="text-[11px] text-muted-foreground">Check-out</span>
                  <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-secondary border border-border px-3 py-2.5 text-sm" />
                </label>
              </div>
              <div className="mt-4 text-center text-xs text-muted-foreground">
                <span className="text-primary font-bold">{nights}</span> night{nights > 1 ? "s" : ""} · {fmt(subtotal)}
              </div>
            </div>
            <div className="rounded-2xl bg-primary/5 border border-primary/20 p-3.5 flex gap-3">
              <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Free cancellation up to 48h before check-in. Funds held in escrow until 24h after arrival.
              </p>
            </div>
          </section>
        )}

        {/* STEP 2 — Guests */}
        {step === 2 && (
          <section className="space-y-4">
            <div className="rounded-2xl bg-card border border-border p-4">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">Number of guests</h3>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Adults</div>
                  <div className="text-[11px] text-muted-foreground">Ages 13+</div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setGuests((g) => Math.max(1, g - 1))}
                    className="w-9 h-9 rounded-full border border-border bg-secondary text-lg">−</button>
                  <span className="w-6 text-center font-bold">{guests}</span>
                  <button onClick={() => setGuests((g) => Math.min(10, g + 1))}
                    className="w-9 h-9 rounded-full border border-border bg-secondary text-lg">+</button>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-card border border-border p-4">
              <h3 className="font-bold text-sm mb-2">Message to host (optional)</h3>
              <textarea rows={3} placeholder="Hi! Looking forward to staying."
                className="w-full rounded-xl bg-secondary border border-border px-3 py-2 text-sm resize-none" />
            </div>
          </section>
        )}

        {/* STEP 3 — Pay */}
        {step === 3 && (
          <section className="space-y-4">
            <div className="rounded-2xl bg-card border border-border p-4">
              <h3 className="font-bold text-sm mb-3">Price details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">{p.price} × {nights} nights</span><span>{fmt(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Service & escrow fee</span><span>{fmt(fees)}</span></div>
                <div className="border-t border-border pt-2 mt-2 flex justify-between font-extrabold">
                  <span>Total</span><span className="text-primary">{fmt(total)}</span>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-card border border-border p-4">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">Pay with Paystack</h3>
              </div>
              <div className="space-y-2">
                {[
                  { e: "💳", l: "Card (Visa/Verve/Mastercard)", d: true },
                  { e: "🏦", l: "Bank transfer", d: false },
                  { e: "📱", l: "USSD", d: false },
                ].map((m) => (
                  <label key={m.l} className={`flex items-center gap-3 rounded-xl border px-3 py-3 cursor-pointer ${m.d ? "border-primary bg-primary/5" : "border-border"}`}>
                    <input type="radio" name="pm" defaultChecked={m.d} className="accent-primary" />
                    <span className="text-lg">{m.e}</span>
                    <span className="text-sm font-medium flex-1">{m.l}</span>
                  </label>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-3 text-center">🔒 Secured by Paystack · PCI-DSS Level 1</p>
            </div>
          </section>
        )}

        {/* STEP 4 — Success */}
        {step === 4 && (
          <section className="text-center py-10">
            <div className="w-20 h-20 rounded-full bg-success/15 border-2 border-success flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-success" />
            </div>
            <h2 className="text-xl font-extrabold">Booking confirmed!</h2>
            <p className="text-sm text-muted-foreground mt-2">Reference <span className="font-mono text-foreground">SA-BK-{Math.floor(Math.random() * 9000 + 1000)}</span></p>
            <div className="mt-6 rounded-2xl bg-card border border-border p-4 text-left text-xs space-y-1.5">
              <div className="flex justify-between"><span className="text-muted-foreground">Check-in</span><span className="font-semibold">{checkIn}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Check-out</span><span className="font-semibold">{checkOut}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Guests</span><span className="font-semibold">{guests}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total paid</span><span className="font-extrabold text-primary">{fmt(total)}</span></div>
            </div>
            <div className="mt-6 grid gap-2">
              <Link to="/bookings" className="rounded-2xl bg-primary text-primary-foreground py-3 font-bold text-sm">View my bookings</Link>
              <Link to="/explore" className="rounded-2xl border border-border bg-card py-3 font-bold text-sm">Keep exploring</Link>
            </div>
          </section>
        )}
      </div>

      {/* Sticky CTA */}
      {step < 4 && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur-xl border-t border-border safe-bottom">
          <div className="max-w-md mx-auto px-5 py-3 pb-20 flex items-center gap-3">
            <div className="flex-1">
              <div className="text-primary font-extrabold text-base leading-none">{fmt(total)}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{nights} night{nights > 1 ? "s" : ""} · escrow protected</div>
            </div>
            <button
              disabled={paying}
              onClick={step === 3 ? pay : next}
              className="bg-primary text-primary-foreground rounded-full px-6 h-12 font-bold text-sm disabled:opacity-60"
            >
              {step === 3 ? (paying ? "Processing…" : "Pay now") : "Continue"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
};

export default BookProperty;
