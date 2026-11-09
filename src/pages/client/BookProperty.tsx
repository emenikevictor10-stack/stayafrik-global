import { idAllowsPayment } from "@/lib/guest-id";
import { useSettings } from "@/hooks/useSettings";
import { serviceFee } from "@/lib/settings";
import { recallSearch } from "@/lib/search-state";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { SignInSheet } from "@/components/auth/SignInSheet";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { useRatePlan } from "@/hooks/useRatePlan";
import { quoteLocalStay } from "../../../supabase/functions/_shared/booking-core";
import { isBlocked, rangeHitsBlocked, nextBlockedAfter } from "@/lib/blocked-dates";
import { cn } from "@/lib/utils";
import {
  ChevronLeft, Calendar as CalIcon, Users, ShieldCheck, CreditCard,
  Minus, Plus, Star, Loader2, Landmark, type LucideIcon,
} from "lucide-react";
import { loadPaystackInline } from "@/lib/paystack-inline";
import { toast } from "sonner";

type Step = 1 | 2 | 3;

const fmt = (n: number) => "₦" + Math.round(n).toLocaleString();

const BookProperty = () => {
  const { id } = useParams();
  const { serviceFeeBps, features } = useSettings();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: p, loading } = useListing(id);
  const [qs, setQs] = useSearchParams();
  const draftKey = `sg-checkout:${id}`;
  const draft = useMemo(() => { try { return JSON.parse(sessionStorage.getItem(draftKey) || "null"); } catch { return null; } }, [draftKey]);
  const [signInOpen, setSignInOpen] = useState(false);

  const [step, setStep] = useState<Step>(() => (draft?.step as Step) || 1);
  const [range, setRange] = useState<DateRange | undefined>(() => {
    if (draft?.checkIn && draft?.checkOut) return { from: new Date(draft.checkIn + "T00:00:00"), to: new Date(draft.checkOut + "T00:00:00") };
    const s = recallSearch();
    if (s?.checkIn && s?.checkOut && s.checkIn >= format(new Date(), "yyyy-MM-dd")) return { from: new Date(s.checkIn + "T00:00:00"), to: new Date(s.checkOut + "T00:00:00") };
    return { from: addDays(new Date(), 2), to: addDays(new Date(), 5) };
  });
  const [calOpen, setCalOpen] = useState(false);
  const checkIn = range?.from;
  const checkOut = range?.to;
  const [guests, setGuests] = useState(() => { if (draft?.guests) return draft.guests as number; const s = recallSearch(); return s ? Math.max(1, (s.adults || 0) + (s.children || 0)) || 2 : 2; });
  const [paying, setPaying] = useState(false);
  const [guestName, setGuestName] = useState<string>(draft?.name || user?.user_metadata?.full_name || "");
  const [guestEmail, setGuestEmail] = useState<string>(draft?.email || user?.email || "");
  const [guestPhone, setGuestPhone] = useState<string>(draft?.phone || "+234");
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
  // Keep the checkout draft so it survives the Google sign-in round trip.
  useEffect(() => {
    try {
      sessionStorage.setItem(draftKey, JSON.stringify({
        step: step === 3 && p?.source === "rayprop" ? 2 : step,
        checkIn: range?.from ? format(range.from, "yyyy-MM-dd") : null,
        checkOut: range?.to ? format(range.to, "yyyy-MM-dd") : null,
        guests, name: guestName, email: guestEmail, phone: guestPhone,
      }));
    } catch { /* storage off */ }
  }, [draftKey, step, range, guests, guestName, guestEmail, guestPhone, p?.source]);

  // Back from Google sign-in: carry on where the guest pressed Pay.
  const resumeRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (!user || !p || qs.get("resume") !== "1") return;
    const next = new URLSearchParams(qs); next.delete("resume"); setQs(next, { replace: true });
    const t = setTimeout(() => resumeRef.current(), 300);
    return () => clearTimeout(t);
  }, [user, p]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!hold) return;
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [hold]);

  const [splitCount, setSplitCount] = useState(0);
  const [splitMode, setSplitMode] = useState<"equal" | "custom">("equal");
  const [people, setPeople] = useState<{ name: string; phone: string; email: string; amount: string }[]>([]);
  useEffect(() => {
    setPeople((prev) => Array.from({ length: splitCount }, (_, i) => prev[i] ?? { name: "", phone: "", email: "", amount: "" }));
  }, [splitCount]);
  const [payMethod, setPayMethod] = useState<"card" | "bank">("card");
  const isPartnerListing = p?.source === "rayprop";
  const { blocked, loaded: blockedLoaded } = useBlockedDates(
    isPartnerListing ? p?.raypropListingId || p?.id : p?.id,
    isPartnerListing,
  );

  const ratePlan = useRatePlan(p?.id, isPartnerListing);

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
  const localQuote = !isPartner && checkIn && checkOut
    ? quoteLocalStay(format(checkIn, "yyyy-MM-dd"), format(checkOut, "yyyy-MM-dd"), ratePlan ?? { price_per_night: p.priceNum }, serviceFeeBps)
    : null;
  const lq = localQuote?.ok ? localQuote : null;
  const subtotal = lq ? koboToNaira(lq.subtotal_kobo) : p.priceNum * nights;
  const fees = isPartner ? 0 : lq ? koboToNaira(lq.fee_kobo) : serviceFee(subtotal, serviceFeeBps);
  const total = isPartner && quote ? koboToNaira(quote.totalKobo) : subtotal + fees;
  const splitBlocked = splitCount >= 2 && splitMode === "custom" && payMethod === "card" && !isPartnerListing
    && (people.some((x) => Number(x.amount || 0) < 1000) || people.reduce((a, x) => a + Number(x.amount || 0), 0) !== Math.round(Number(total) || 0));
  const holdSecsLeft = hold ? Math.max(0, Math.floor((new Date(hold.expiresAt).getTime() - nowMs) / 1000)) : 0;
  const holdExpired = isPartner && !!hold && holdSecsLeft === 0;

  const preparePartner = async () => {
    if (!user) return setSignInOpen(true);
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
      if (localQuote && localQuote.ok === false) return toast.error(localQuote.error);
      setStep(2);
    } else if (step === 2) {
      if (isPartner) return void preparePartner();
      if (p.maxGuests && guests > p.maxGuests) return toast.error(`This place fits up to ${p.maxGuests} guests`);
      setStep(3);
    }
  };


  const pay = async () => {
    if (!user) return setSignInOpen(true);
    if (features.id_required) {
      const { data: k } = await supabase.from("kyc_submissions").select("status").eq("user_id", user.id).maybeSingle();
      if (!idAllowsPayment(k?.status, true)) { toast.message("Add your ID to book"); return navigate(`/details?next=${encodeURIComponent(`/property/${id}/book?resume=1`)}`); }
    }
    if (!datesValid) return toast.error("Pick valid dates");
    if (isPartner && (!quote || !hold)) return toast.error("Get a price first");
    if (holdExpired) return toast.error("Your hold expired — get a new price");
    if (isPartner && hold && holdSecsLeft < 120) return toast.error("Less than 2 minutes left on your hold — get a fresh price first");
    setPaying(true);
    try {
      const callback_url = `${window.location.origin}/booking/confirm`;
      const useBank = payMethod === "bank" && features.bank_transfer;
      const { data, error } = await supabase.functions.invoke("paystack-init", {
        body: {
          listing_id: p.id,
          check_in: format(checkIn!, "yyyy-MM-dd"),
          check_out: format(checkOut!, "yyyy-MM-dd"),
          guests,
          callback_url,
          ...(useBank ? { method: "bank_transfer" } : {}),
          ...(isPartner ? {
            source: "rayprop", quote_id: quote!.id, hold_id: hold!.id,
            title: p.title, image: p.image, city: p.city || p.location,
            guest: { name: guestName.trim(), email: guestEmail.trim(), phone: guestPhone.replace(/[\s-]/g, "") },
          } : splitCount >= 2 && !useBank ? (splitMode === "custom"
            ? { shares: people.map((x) => ({ amount_kobo: Math.round(Number(x.amount || 0) * 100), name: x.name, phone: x.phone, email: x.email })) }
            : { split_count: splitCount, people: people.map((x) => ({ name: x.name, phone: x.phone, email: x.email })) }) : {}),
        },
      });
      if (error) {
        const ctx: any = (error as any).context;
        const msg = ctx?.json ? (await ctx.json().catch(() => null))?.error : null;
        if (msg === "Add your ID to book") { toast.message(msg); navigate(`/details?next=${encodeURIComponent(`/property/${id}/book?resume=1`)}`); return; }
        throw new Error(msg || error.message);
      }
      if (data?.bank_transfer?.id) { try { sessionStorage.removeItem(draftKey); } catch { /* */ } navigate(`/pay/transfer/${data.bank_transfer.id}`); return; }
      if (!data?.access_code || !data?.reference) {
        throw new Error(data?.error || "Could not start payment");
      }

      await loadPaystackInline();
      const PaystackPop = (window as any).PaystackPop;
      const popup = new PaystackPop();
      popup.resumeTransaction(data.access_code, {
        onSuccess: (tx: { reference: string }) => {
          if (data.split) { void supabase.functions.invoke("paystack-verify", { body: { reference: tx.reference || data.reference } }).finally(() => navigate(`/trips/${data.booking_id}`)); return; }
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

  resumeRef.current = () => { if (step === 3 && !isPartner) void pay(); else if (step === 2 && isPartner) void preparePartner(); };

  return (
    <main className="pb-36 min-h-screen bg-background">
      <SignInSheet open={signInOpen} onOpenChange={setSignInOpen} returnPath={`/property/${id}/book?resume=1`} title={step === 2 ? "Sign in to hold this stay" : "Sign in to pay"} />
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="px-5 py-3 flex items-center gap-3">
          <button
            onClick={back}
            className="w-11 h-11 rounded-full bg-card border border-border flex items-center justify-center"
            aria-label="Back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">Step {step} of 3</div>
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
            <p className="text-xs text-muted-foreground truncate">📍 {p.location}</p>
            <div className="flex items-center gap-1 mt-1 text-xs">
              <Star className="w-3 h-3 fill-primary text-primary" />
              <span className="font-semibold">{p.rating}</span>
              <span className="text-muted-foreground">· {p.reviews}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-primary text-sm font-extrabold">{p.price}</div>
            <div className="text-xs text-muted-foreground">/ night</div>
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
                <div className="text-xs font-semibold tracking-wide text-muted-foreground">Check-in → Check-out</div>
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
                  <p className="text-xs text-muted-foreground">
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
              <p className="text-xs text-muted-foreground leading-relaxed">
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
                  <div className="text-xs text-muted-foreground">Ages 13+</div>
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
                <p className="text-xs text-muted-foreground">Our partner needs these to prepare your stay.</p>
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
                <div className={cn("mt-2 rounded-xl px-3 py-2 text-xs font-semibold", holdExpired ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>
                  {holdExpired ? (
                    <button onClick={preparePartner} className="underline">Your hold expired — get a new price</button>
                  ) : (
                    <>Dates held for you · {Math.floor(holdSecsLeft / 60)}:{String(holdSecsLeft % 60).padStart(2, "0")}</>
                  )}
                </div>
              </div>
              ) : (
              <div className="space-y-2 text-sm">
                {lq ? (
                  <>
                    <div className="flex justify-between"><span className="text-muted-foreground">{nights} night{nights > 1 ? "s" : ""}{new Set(lq.nights.map((n) => n.kobo)).size > 1 ? " (prices vary by night)" : ` × ${fmt(koboToNaira(lq.nights[0].kobo))}`}</span><span>{fmt(koboToNaira(lq.nights_kobo))}</span></div>
                    {lq.discount_kobo > 0 && <div className="flex justify-between"><span className="text-muted-foreground">{lq.discount_pct}% {nights >= 28 ? "monthly" : "weekly"} discount</span><span>−{fmt(koboToNaira(lq.discount_kobo))}</span></div>}
                    {lq.cleaning_kobo > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Cleaning fee</span><span>{fmt(koboToNaira(lq.cleaning_kobo))}</span></div>}
                  </>
                ) : (
                  <div className="flex justify-between"><span className="text-muted-foreground">{p.price} × {nights} night{nights > 1 ? "s" : ""}</span><span>{fmt(subtotal)}</span></div>
                )}
                {ratePlan?.booking_mode === "request" && <p className="text-xs text-muted-foreground">The host accepts requests within 24 hours. If they don't, you get a full refund.</p>}
                <div className="flex justify-between"><span className="text-muted-foreground">Service & escrow fee</span><span>{fmt(fees)}</span></div>
                <div className="border-t border-border pt-2 mt-2 flex justify-between font-extrabold">
                  <span>Total (NGN)</span><span className="text-primary">{fmt(total)}</span>
                </div>
              </div>
              )}
            </div>

            {!isPartner && features.split_payments && payMethod === "card" && (
              <div className="rounded-2xl bg-card border border-border p-4">
                <h3 className="font-bold text-sm mb-1">Split the cost</h3>
                <p className="text-xs text-muted-foreground mb-2">Each person pays their part. Your dates are held for a few hours while everyone pays; if anyone doesn't, everyone is refunded.</p>
                <div className="flex flex-wrap gap-2">
                  {[0, 2, 3, 4, 5, 6].map((n) => (
                    <button key={n} type="button" aria-pressed={splitCount === n} onClick={() => setSplitCount(n)}
                      className={cn("min-h-11 px-3 rounded-lg border text-[13px] font-semibold", splitCount === n ? "border-foreground bg-surface" : "border-border")}>
                      {n === 0 ? "Pay it all" : `${n} people`}
                    </button>
                  ))}
                </div>
                {splitCount >= 2 && (
                  <div className="mt-3 space-y-3">
                    <div className="flex gap-2" role="radiogroup" aria-label="How to split">
                      {(["equal", "custom"] as const).map((m) => (
                        <button key={m} type="button" role="radio" aria-checked={splitMode === m} onClick={() => setSplitMode(m)}
                          className={cn("min-h-11 px-3 rounded-lg border text-[13px] font-semibold", splitMode === m ? "border-foreground bg-surface" : "border-border")}>
                          {m === "equal" ? "Split equally" : "Set amounts"}
                        </button>
                      ))}
                    </div>
                    {people.map((x, i) => (
                      <div key={i} className="rounded-xl border border-border p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[13px] font-semibold">{i === 0 ? "You" : `Person ${i + 1}`}</span>
                          {splitMode === "custom"
                            ? <input inputMode="numeric" aria-label={`Amount for ${i === 0 ? "you" : `person ${i + 1}`}`} placeholder="₦ amount" value={x.amount}
                                onChange={(e) => setPeople((ps) => ps.map((q, j) => j === i ? { ...q, amount: e.target.value.replace(/[^0-9]/g, "") } : q))}
                                className="w-32 h-11 rounded-lg border border-border bg-background px-3 text-base text-right" />
                            : <span className="text-[13px]">{fmt(i === 0 ? total - Math.floor(total / splitCount) * (splitCount - 1) : Math.floor(total / splitCount))}</span>}
                        </div>
                        {i > 0 && (
                          <div className="grid gap-2 sm:grid-cols-3">
                            {(["name", "phone", "email"] as const).map((f) => (
                              <input key={f} aria-label={`${f} for person ${i + 1}`} placeholder={f === "name" ? "Name (optional)" : f === "phone" ? "Phone (optional)" : "Email for reminders (optional)"}
                                type={f === "email" ? "email" : f === "phone" ? "tel" : "text"} value={x[f]}
                                onChange={(e) => setPeople((ps) => ps.map((q, j) => j === i ? { ...q, [f]: e.target.value } : q))}
                                className="h-11 rounded-lg border border-border bg-background px-3 text-base" />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {splitMode === "custom" && (() => {
                      const sum = people.reduce((a, x) => a + Number(x.amount || 0), 0);
                      const left = Math.round(total) - sum;
                      return <p className={cn("text-[13px]", left === 0 ? "text-muted-foreground" : "text-destructive")}>
                        {left === 0 ? "Amounts add up to the total." : left > 0 ? `${fmt(left)} still to share out.` : `${fmt(-left)} more than the total.`}
                      </p>;
                    })()}
                    <p className="text-[13px]">You pay your part now, then send links to the others.</p>
                  </div>
                )}
              </div>
            )}

            <div className="rounded-2xl bg-card border border-border p-4 space-y-2" role="radiogroup" aria-label="How do you want to pay?">
              <h3 className="font-bold text-sm">How do you want to pay?</h3>
              <MethodOption checked={payMethod === "card"} onClick={() => setPayMethod("card")} Icon={CreditCard}
                title="Pay by card (Paystack)" sub="Cards, USSD and more on the next screen. Confirmed instantly." />
              {features.bank_transfer && (
                <MethodOption checked={payMethod === "bank"} onClick={() => setPayMethod("bank")} Icon={Landmark}
                  title="Pay by bank transfer" sub={isPartner ? "Send to our account, upload the receipt. We confirm after checking — the partner stay is booked then." : "Send to our account and upload the receipt. Dates held 2 hours; we confirm after checking."} />
              )}
            </div>
          </section>
        )}
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 inset-x-0 md:left-60 z-30 bg-background/95 backdrop-blur-xl border-t border-border safe-bottom">
        <div className="max-w-md mx-auto px-5 py-3 pb-20 flex items-center gap-3">
          <div className="flex-1">
            <div className="text-primary font-extrabold text-base leading-none">{datesValid ? fmt(total) : "—"}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {datesValid ? `${nights} night${nights > 1 ? "s" : ""} · escrow protected` : "Pick dates to continue"}
            </div>
          </div>
          <button
            disabled={paying || preparing || (step === 1 && !datesValid) || (step === 3 && holdExpired) || splitBlocked}
            onClick={step === 3 ? pay : goNext}
            className="bg-primary text-primary-foreground rounded-full px-6 h-12 font-bold text-sm disabled:opacity-60 inline-flex items-center gap-2"
          >
            {step === 3
              ? (paying ? <><Loader2 className="w-4 h-4 animate-spin" /> {payMethod === "bank" ? "Holding dates…" : "Redirecting…"}</> : payMethod === "bank" && features.bank_transfer ? "Get bank details" : "Pay securely")
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
    className="w-11 h-11 rounded-full border border-border bg-secondary flex items-center justify-center disabled:opacity-40"
  >
    {children}
  </button>
);

const Field = ({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) => (
  <label className="block">
    <span className="text-xs font-semibold tracking-wide text-muted-foreground">{label}</span>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} maxLength={254}
      className="mt-1 w-full rounded-xl bg-secondary border border-border px-3 py-2.5 text-sm font-semibold outline-none focus:border-primary" />
  </label>
);

const MethodOption = ({ checked, onClick, Icon, title, sub }: { checked: boolean; onClick: () => void; Icon: LucideIcon; title: string; sub: string }) => (
  <button type="button" role="radio" aria-checked={checked} onClick={onClick}
    className={cn("w-full text-left flex gap-3 rounded-xl border p-3 min-h-11", checked ? "border-foreground bg-surface" : "border-border")}>
    <Icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
    <span className="flex-1"><span className="block text-sm font-semibold">{title}</span><span className="block text-xs text-muted-foreground mt-0.5">{sub}</span></span>
    <span className={cn("w-4 h-4 rounded-full border-2 shrink-0 mt-0.5", checked ? "border-primary bg-primary" : "border-border")} />
  </button>
);

const Pill = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl bg-secondary border border-border px-3 py-2">
    <div className="text-xs tracking-wide text-muted-foreground">{label}</div>
    <div className="text-sm font-bold mt-0.5">{value}</div>
  </div>
);

export default BookProperty;
