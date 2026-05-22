import { useParams, useNavigate, Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { format, differenceInCalendarDays, addDays } from "date-fns";
import { useListing } from "@/hooks/useListings";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  ChevronLeft, Calendar as CalIcon, Users, ShieldCheck, CreditCard,
  Minus, Plus, Star, Loader2,
} from "lucide-react";
import { toast } from "sonner";

type Step = 1 | 2 | 3;

const fmt = (n: number) => "₦" + Math.round(n).toLocaleString();

const BookProperty = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: p, loading } = useListing(id);

  const [step, setStep] = useState<Step>(1);
  const [checkIn, setCheckIn] = useState<Date | undefined>(addDays(new Date(), 2));
  const [checkOut, setCheckOut] = useState<Date | undefined>(addDays(new Date(), 5));
  const [guests, setGuests] = useState(2);
  const [paying, setPaying] = useState(false);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    return Math.max(0, differenceInCalendarDays(checkOut, checkIn));
  }, [checkIn, checkOut]);

  if (loading) {
    return (
      <main className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </main>
    );
  }
  if (!p) return <main className="p-8 text-center text-sm text-muted-foreground">Property not found</main>;

  const subtotal = p.priceNum * nights;
  const fees = Math.round(subtotal * 0.08);
  const total = subtotal + fees;

  const datesValid = !!checkIn && !!checkOut && nights >= 1;

  const back = () => (step === 1 ? navigate(-1) : setStep((s) => ((s - 1) as Step)));

  const goNext = () => {
    if (step === 1) {
      if (!datesValid) return toast.error("Pick check-in and check-out dates");
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const pay = async () => {
    if (!user) return toast.error("Please sign in");
    if (!datesValid) return toast.error("Pick valid dates");
    setPaying(true);
    try {
      const callback_url = `${window.location.origin}/booking/confirm`;
      const { data, error } = await supabase.functions.invoke("paystack-init", {
        body: {
          listing_id: p.id,
          check_in: format(checkIn!, "yyyy-MM-dd"),
          check_out: format(checkOut!, "yyyy-MM-dd"),
          guests,
          callback_url,
        },
      });
      if (error) throw new Error(error.message);
      if (!data?.authorization_url) throw new Error(data?.error || "Could not start payment");
      window.location.href = data.authorization_url;
    } catch (e: any) {
      toast.error(e.message || "Payment failed to start");
      setPaying(false);
    }
  };

  const stepLabel =
    step === 1 ? "When are you staying?" :
    step === 2 ? "Who's coming?" :
    "Review & pay";

  return (
    <main className="pb-36 min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="px-5 py-3 flex items-center gap-3">
          <button
            onClick={back}
            className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center"
            aria-label="Back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <div className="text-[11px] text-muted-foreground">Step {step} of 3</div>
            <div className="text-sm font-bold">{stepLabel}</div>
          </div>
        </div>
        <div className="h-1 bg-secondary">
          <div className="h-full bg-primary transition-all" style={{ width: `${(step / 3) * 100}%` }} />
        </div>
      </header>

      <div className="px-5 pt-5 max-w-md mx-auto">
        {/* Property summary */}
        <section className="flex gap-3 rounded-2xl bg-card border border-border p-3 mb-5">
          <img src={p.image} alt={p.title} className="w-20 h-20 rounded-xl object-cover" />
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm truncate">{p.title}</h2>
            <p className="text-[11px] text-muted-foreground truncate">📍 {p.location}</p>
            <div className="flex items-center gap-1 mt-1 text-[11px]">
              <Star className="w-3 h-3 fill-primary text-primary" />
              <span className="font-semibold">{p.rating}</span>
              <span className="text-muted-foreground">· {p.reviews}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-primary text-sm font-extrabold">{p.price}</div>
            <div className="text-[10px] text-muted-foreground">/ night</div>
          </div>
        </section>

        {/* STEP 1 — Dates */}
        {step === 1 && (
          <section className="space-y-4">
            <div className="rounded-2xl bg-card border border-border p-4">
              <div className="flex items-center gap-2 mb-3">
                <CalIcon className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">Select dates</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <DateField label="Check-in" date={checkIn} onChange={setCheckIn} minDate={new Date()} />
                <DateField label="Check-out" date={checkOut} onChange={setCheckOut} minDate={checkIn ? addDays(checkIn, 1) : addDays(new Date(), 1)} />
              </div>
              <div className="mt-4 text-center text-xs text-muted-foreground">
                {datesValid ? (
                  <><span className="text-primary font-bold">{nights}</span> night{nights > 1 ? "s" : ""} · {fmt(subtotal)}</>
                ) : (
                  "Pick check-in and check-out"
                )}
              </div>
            </div>
            <div className="rounded-2xl bg-primary/5 border border-primary/20 p-3.5 flex gap-3">
              <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Free cancellation up to 48h before check-in. Funds held in escrow until 24h after arrival.
              </p>
            </div>
          </section>
        )}

        {/* STEP 2 — Guests */}
        {step === 2 && (
          <section className="space-y-4">
            <div className="rounded-2xl bg-card border border-border p-5">
              <div className="flex items-center gap-2 mb-5">
                <Users className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">Number of guests</h3>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Adults</div>
                  <div className="text-[11px] text-muted-foreground">Ages 13+</div>
                </div>
                <div className="flex items-center gap-3">
                  <Counter onClick={() => setGuests((g) => Math.max(1, g - 1))} disabled={guests <= 1}>
                    <Minus className="w-4 h-4" />
                  </Counter>
                  <span className="w-6 text-center font-bold tabular-nums">{guests}</span>
                  <Counter onClick={() => setGuests((g) => Math.min(10, g + 1))} disabled={guests >= 10}>
                    <Plus className="w-4 h-4" />
                  </Counter>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* STEP 3 — Review & Pay */}
        {step === 3 && (
          <section className="space-y-4">
            <div className="rounded-2xl bg-card border border-border p-4">
              <h3 className="font-bold text-sm mb-3">Your trip</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <Pill label="Check-in" value={checkIn ? format(checkIn, "EEE, d MMM") : "—"} />
                <Pill label="Check-out" value={checkOut ? format(checkOut, "EEE, d MMM") : "—"} />
                <Pill label="Guests" value={`${guests}`} />
                <Pill label="Nights" value={`${nights}`} />
              </div>
            </div>

            <div className="rounded-2xl bg-card border border-border p-4">
              <h3 className="font-bold text-sm mb-3">Price details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">{p.price} × {nights} night{nights > 1 ? "s" : ""}</span><span>{fmt(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Service & escrow fee</span><span>{fmt(fees)}</span></div>
                <div className="border-t border-border pt-2 mt-2 flex justify-between font-extrabold">
                  <span>Total (NGN)</span><span className="text-primary">{fmt(total)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-card border border-border p-4">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">Pay with Paystack</h3>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Cards (Visa, Mastercard, Verve), Bank transfer, USSD and more on the next screen.
              </p>
              <p className="text-[10px] text-muted-foreground mt-3">🔒 Secured by Paystack · PCI-DSS Level 1</p>
            </div>
          </section>
        )}
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur-xl border-t border-border safe-bottom">
        <div className="max-w-md mx-auto px-5 py-3 pb-20 flex items-center gap-3">
          <div className="flex-1">
            <div className="text-primary font-extrabold text-base leading-none">{datesValid ? fmt(total) : "—"}</div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {datesValid ? `${nights} night${nights > 1 ? "s" : ""} · escrow protected` : "Pick dates to continue"}
            </div>
          </div>
          <button
            disabled={paying || (step === 1 && !datesValid)}
            onClick={step === 3 ? pay : goNext}
            className="bg-primary text-primary-foreground rounded-full px-6 h-12 font-bold text-sm disabled:opacity-60 inline-flex items-center gap-2"
          >
            {step === 3
              ? (paying ? <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting…</> : "Pay securely")
              : "Continue"}
          </button>
        </div>
      </div>
    </main>
  );
};

const DateField = ({
  label, date, onChange, minDate,
}: { label: string; date?: Date; onChange: (d?: Date) => void; minDate?: Date }) => (
  <Popover>
    <PopoverTrigger asChild>
      <button
        className={cn(
          "w-full rounded-xl bg-secondary border border-border px-3 py-3 text-left",
          !date && "text-muted-foreground"
        )}
      >
        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-sm font-bold mt-0.5">{date ? format(date, "EEE, d MMM") : "Pick a date"}</div>
      </button>
    </PopoverTrigger>
    <PopoverContent align="start" className="w-auto p-0">
      <Calendar
        mode="single"
        selected={date}
        onSelect={onChange}
        disabled={(d) => (minDate ? d < minDate : false)}
        initialFocus
        className={cn("p-3 pointer-events-auto")}
      />
    </PopoverContent>
  </Popover>
);

const Counter = ({
  children, onClick, disabled,
}: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="w-9 h-9 rounded-full border border-border bg-secondary flex items-center justify-center disabled:opacity-40"
  >
    {children}
  </button>
);

const Pill = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl bg-secondary border border-border px-3 py-2">
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="text-sm font-bold mt-0.5">{value}</div>
  </div>
);

export default BookProperty;
