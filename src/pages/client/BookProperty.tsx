import { recallSearch } from "@/lib/search-state";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { quoteRayProp, holdRayProp, type RayPropQuote } from "@/lib/rayprop";
import { koboToNaira } from "@/lib/rayprop-map";
import { format, differenceInCalendarDays, addDays } from "date-fns";
import { useListing } from "@/hooks/useListings";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { DateRange } from "react-day-picker";
import { useBlockedDates } from "@/hooks/useBlockedDates";
import { isBlocked, rangeHitsBlocked, nextBlockedAfter } from "@/lib/blocked-dates";
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
  const [range, setRange] = useState<DateRange | undefined>(() => {
    const s = recallSearch();
    if (s?.checkIn && s?.checkOut && s.checkIn >= format(new Date(), "yyyy-MM-dd")) return { from: new Date(s.checkIn + "T00:00:00"), to: new Date(s.checkOut + "T00:00:00") };
    return { from: addDays(new Date(), 2), to: addDays(new Date(), 5) };
  });
  const [calOpen, setCalOpen] = useState(false);
  const checkIn = range?.from;
  const checkOut = range?.to;
  const [guests, setGuests] = useState(() => { const s = recallSearch(); return s ? Math.max(1, (s.adults || 0) + (s.children || 0)) || 2 : 2; });
  const [paying, setPaying] = useState(false);
  const [guestName, setGuestName] = useState<string>(user?.user_metadata?.full_name || "");
  const [guestEmail, setGuestEmail] = useState<string>(user?.email || "");
  const [guestPhone, setGuestPhone] = useState<string>("+234");
  const [quote, setQuote] = useState<RayPropQuote | null>(null);
  const [hold, setHold] = useState<{ id: string; expiresAt: string } | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name,phone,email").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data?.full_name) setGuestName((v) => v || data.full_name!);
      if (data?.email) setGuestEmail((v) => v || data.email!);
      if (data?.phone) setGuestPhone((v) => (v === "+234" ? data.phone! : v));
    });
  }, [user?.id]);
  useEffect(() => {
    if (!hold) return;
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [hold]);

  const isPartnerListing = p?.source === "rayprop";
  const { blocked, loaded: blockedLoaded } = useBlockedDates(
    isPartnerListing ? p?.raypropListingId || p?.id : p?.id,
    isPartnerListing,
  );

  // Range select that never spans a blocked night.
  const onRangeSelect = (r: DateRange | undefined) => {
    if (!r?.from) return setRange(undefined);
    if (r.from && r.to && rangeHitsBlocked(blocked, r.from, r.to)) {
      // Restart the selection at the new start date instead of allowing a blocked span.
      return setRange({ from: r.to, to: undefined });
    }
    setRange(r);
  };

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

  const isPartner = p.source === "rayprop";
  const subtotal = p.priceNum * nights;
  const fees = isPartner ? 0 : Math.round(subtotal * 0.08);
  const total = isPartner && quote ? koboToNaira(quote.totalKobo) : subtotal + fees;
  const holdSecsLeft = hold ? Math.max(0, Math.floor((new Date(hold.expiresAt).getTime() - nowMs) / 1000)) : 0;
  const holdExpired = isPartner && !!hold && holdSecsLeft === 0;

  const preparePartner = async () => {
    if (!user) return toast.error("Please sign in");
    const phone = guestPhone.replace(/[\s-]/g, "");
    if (guestName.trim().length < 2) return toast.error("Enter your full name");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(guestEmail)) return toast.error("Enter a valid email");
    if (!/^\+\d{8,15}$/.test(phone)) return toast.error("Enter your phone as +234…");
    setPreparing(true);
    try {
      const q = await quoteRayProp({ listing_id: p.raypropListingId || p.id, check_in: format(checkIn!, "yyyy-MM-dd"), check_out: format(checkOut!, "yyyy-MM-dd"), guests });
      const h = await holdRayProp({ quote_id: q.id, guest_name: guestName.trim(), guest_phone: phone, guest_email: guestEmail.trim() });
      setQuote(q); setHold(h); setNowMs(Date.now()); setStep(3);
    } catch (e: any) {
      console.error("[rayprop] quote/hold failed", e);
      toast.error(e.message || "Couldn't get a price. Please try again.");
    } finally { setPreparing(false); }
  };

  const datesValid = !!checkIn && !!checkOut && nights >= 1;

  const back = () => (step === 3 && isPartner ? (setQuote(null), setHold(null), setStep(2)) : step === 1 ? navigate(-1) : setStep((s) => ((s - 1) as Step)));

  const goNext = () => {
    if (step === 1) {
      if (!datesValid) return toast.error("Pick check-in and check-out dates");
      setStep(2);
    } else if (step === 2) {
      if (isPartner) return void preparePartner();
      if (p.maxGuests && guests > p.maxGuests) return toast.error(`This place fits up to ${p.maxGuests} guests`);
      setStep(3);
    }
  };

  const loadPaystackInline = () =>
    new Promise<void>((resolve, reject) => {
      if ((window as any).PaystackPop) return resolve();
      const existing = document.querySelector<HTMLScriptElement>('script[data-paystack-inline]');
      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("Failed to load Paystack")));
        return;
      }
      const s = document.createElement("script");
      s.src = "https://js.paystack.co/v2/inline.js";
      s.async = true;
      s.dataset.paystackInline = "true";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load Paystack"));
      document.head.appendChild(s);
    });

  const pay = async () => {
    if (!user) return toast.error("Please sign in");
    if (!datesValid) return toast.error("Pick valid dates");
    if (isPartner && (!quote || !hold)) return toast.error("Get a price first");
    if (holdExpired) return toast.error("Your hold expired — get a new price");
    if (isPartner && hold && holdSecsLeft < 120) return toast.error("Less than 2 minutes left on your hold — get a fresh price first");
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
          ...(isPartner ? {
            source: "rayprop", quote_id: quote!.id, hold_id: hold!.id,
            title: p.title, image: p.image, city: p.city || p.location,
            guest: { name: guestName.trim(), email: guestEmail.trim(), phone: guestPhone.replace(/[\s-]/g, "") },
          } : {}),
        },
      });
      if (error) throw new Error(error.message);
      if (!data?.access_code || !data?.reference) {
        throw new Error(data?.error || "Could not start payment");
      }

      await loadPaystackInline();
      const PaystackPop = (window as any).PaystackPop;
      const popup = new PaystackPop();
      popup.resumeTransaction(data.access_code, {
        onSuccess: (tx: { reference: string }) => {
          window.location.href = `/booking/confirm?reference=${encodeURIComponent(tx.reference || data.reference)}`;
        },
        onCancel: () => {
          setPaying(false);
          toast.message("Payment cancelled");
        },
        onError: (err: any) => {
          setPaying(false);
          toast.error(err?.message || "Payment failed");
        },
      });
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

      <div className="px-5 pt-5 max-w-md md:max-w-xl mx-auto">
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
              <button
                onClick={() => setCalOpen(true)}
                className="w-full rounded-xl bg-secondary border border-border px-3 py-3 text-left"
              >
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Check-in → Check-out</div>
                <div className="text-sm font-bold mt-0.5">
                  {checkIn ? format(checkIn, "EEE, d MMM") : "Pick a date"}
                  {" → "}
                  {checkOut ? format(checkOut, "EEE, d MMM") : "Pick a date"}
                </div>
              </button>
              <div className="mt-4 text-center text-xs text-muted-foreground">
                {datesValid ? (
                  <><span className="text-primary font-bold">{nights}</span> night{nights > 1 ? "s" : ""} · {fmt(subtotal)}</>
                ) : (
                  "Tap to open the calendar"
                )}
              </div>
            </div>

            <Dialog open={calOpen} onOpenChange={setCalOpen}>
              <DialogContent className="max-w-3xl w-[calc(100vw-2rem)] p-4 sm:p-6">
                <DialogHeader>
                  <DialogTitle className="text-sm font-bold">
                    {checkIn && !checkOut
                      ? "Now pick your check-out date"
                      : datesValid
                        ? `${nights} night${nights > 1 ? "s" : ""} · ${format(checkIn!, "d MMM")} → ${format(checkOut!, "d MMM")}`
                        : "Pick your check-in date"}
                  </DialogTitle>
                </DialogHeader>
                <div className="flex justify-center overflow-x-auto">
                  <Calendar
                    mode="range"
                    selected={range}
                    onSelect={onRangeSelect}
                    numberOfMonths={2}
                    disabled={(d) =>
                      d < new Date(new Date().setHours(0, 0, 0, 0)) ||
                      isBlocked(blocked, d) ||
                      (!!checkIn && !checkOut && !!nextBlockedAfter(blocked, checkIn) && d > nextBlockedAfter(blocked, checkIn)!)
                    }
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </div>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <p className="text-[11px] text-muted-foreground">
                    {blockedLoaded ? "Greyed-out dates are taken." : "Checking availability…"}
                  </p>
                  <button
                    onClick={() => setCalOpen(false)}
                    disabled={!datesValid}
                    className="bg-primary text-primary-foreground rounded-full px-5 h-10 font-bold text-sm disabled:opacity-50"
                  >
                    Done
                  </button>
                </div>
              </DialogContent>
            </Dialog>
            <div className="rounded-2xl bg-primary/5 border border-primary/20 p-3.5 flex gap-3">
              <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Full refund up to 48h before check-in, 50% within 48h, none after check-in. Funds held in escrow until 24h after arrival.
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
                  <Counter onClick={() => setGuests((g) => Math.min(p.maxGuests || 10, g + 1))} disabled={guests >= (p.maxGuests || 10)}>
                    <Plus className="w-4 h-4" />
                  </Counter>
                </div>
              </div>
            </div>
            {isPartner && (
              <div className="rounded-2xl bg-card border border-border p-5 space-y-3">
                <h3 className="font-bold text-sm">Your contact details</h3>
                <p className="text-[11px] text-muted-foreground">Our partner needs these to prepare your stay.</p>
                <Field label="Full name" value={guestName} onChange={setGuestName} />
                <Field label="Email" type="email" value={guestEmail} onChange={setGuestEmail} />
                <Field label="Phone" type="tel" value={guestPhone} onChange={setGuestPhone} />
              </div>
            )}
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
              {isPartner && quote ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">{fmt(koboToNaira(quote.ratePerNightKobo + quote.markupPerNightKobo))} × {quote.nights || nights} night{(quote.nights || nights) > 1 ? "s" : ""}</span><span>{fmt(koboToNaira(quote.subtotalKobo))}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">VAT (7.5%)</span><span>{fmt(koboToNaira(quote.vatKobo))}</span></div>
                <div className="border-t border-border pt-2 mt-2 flex justify-between font-extrabold">
                  <span>Total (NGN)</span><span className="text-primary">{fmt(total)}</span>
                </div>
                <div className={cn("mt-2 rounded-xl px-3 py-2 text-[11px] font-semibold", holdExpired ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>
                  {holdExpired ? (
                    <button onClick={preparePartner} className="underline">Your hold expired — get a new price</button>
                  ) : (
                    <>Dates held for you · {Math.floor(holdSecsLeft / 60)}:{String(holdSecsLeft % 60).padStart(2, "0")}</>
                  )}
                </div>
              </div>
              ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">{p.price} × {nights} night{nights > 1 ? "s" : ""}</span><span>{fmt(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Service & escrow fee</span><span>{fmt(fees)}</span></div>
                <div className="border-t border-border pt-2 mt-2 flex justify-between font-extrabold">
                  <span>Total (NGN)</span><span className="text-primary">{fmt(total)}</span>
                </div>
              </div>
              )}
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
      <div className="fixed bottom-0 inset-x-0 md:left-60 z-30 bg-background/95 backdrop-blur-xl border-t border-border safe-bottom">
        <div className="max-w-md mx-auto px-5 py-3 pb-20 flex items-center gap-3">
          <div className="flex-1">
            <div className="text-primary font-extrabold text-base leading-none">{datesValid ? fmt(total) : "—"}</div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {datesValid ? `${nights} night${nights > 1 ? "s" : ""} · escrow protected` : "Pick dates to continue"}
            </div>
          </div>
          <button
            disabled={paying || preparing || (step === 1 && !datesValid) || (step === 3 && holdExpired)}
            onClick={step === 3 ? pay : goNext}
            className="bg-primary text-primary-foreground rounded-full px-6 h-12 font-bold text-sm disabled:opacity-60 inline-flex items-center gap-2"
          >
            {step === 3
              ? (paying ? <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting…</> : "Pay securely")
              : preparing ? <><Loader2 className="w-4 h-4 animate-spin" /> Getting price…</> : "Continue"}
          </button>
        </div>
      </div>
    </main>
  );
};

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

const Field = ({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) => (
  <label className="block">
    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} maxLength={254}
      className="mt-1 w-full rounded-xl bg-secondary border border-border px-3 py-2.5 text-sm font-semibold outline-none focus:border-primary" />
  </label>
);

const Pill = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl bg-secondary border border-border px-3 py-2">
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="text-sm font-bold mt-0.5">{value}</div>
  </div>
);

export default BookProperty;
