import { useEffect, useMemo, useState } from "react";
import { format, addDays } from "date-fns";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { isWeekendNight } from "../../../supabase/functions/_shared/booking-core";

type Plan = {
  price_per_night: number; weekend_price: number | null; cleaning_fee: number; weekly_discount_pct: number;
  monthly_discount_pct: number; min_nights: number; max_nights: number | null; booking_mode: string;
  ical_url: string | null; ical_synced_at: string | null; ical_error: string | null;
};
type Block = { id: string; start_date: string; end_date: string; source: string; note: string | null };

const ymd = (d: Date) => format(d, "yyyy-MM-dd");
const input = "mt-1 w-full rounded-xl bg-card border border-border px-3 py-2 text-sm";

/** Host "Prices and calendar" for one local listing: price rules, booking mode, blocked dates, date prices, calendar import. */
export const RateCalendar = ({ listingId }: { listingId: string }) => {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [booked, setBooked] = useState<{ check_in: string; check_out: string }[]>([]);
  const [range, setRange] = useState<DateRange | undefined>();
  const [datePrice, setDatePrice] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const today = ymd(new Date());
    const [{ data: l }, { data: b }, { data: dp }, { data: br }] = await Promise.all([
      supabase.from("listings").select("price_per_night, weekend_price, cleaning_fee, weekly_discount_pct, monthly_discount_pct, min_nights, max_nights, booking_mode, ical_url, ical_synced_at, ical_error").eq("id", listingId).maybeSingle(),
      supabase.from("listing_blocks").select("id, start_date, end_date, source, note").eq("listing_id", listingId).gte("end_date", today).order("start_date"),
      supabase.from("listing_date_prices").select("date, price").eq("listing_id", listingId).gte("date", today),
      supabase.from("bookings").select("check_in_date, check_out_date").eq("listing_id", listingId)
        .in("status", ["awaiting_host", "confirmed", "released", "needs_attention"]).gte("check_out_date", today),
    ]);
    if (l) setPlan(l as Plan);
    setBlocks((b as Block[]) ?? []);
    setPrices(Object.fromEntries((dp ?? []).map((r) => [r.date, Number(r.price)])));
    setBooked((br ?? []).map((r) => ({ check_in: r.check_in_date, check_out: r.check_out_date })));
  };
  useEffect(() => { load(); }, [listingId]);

  const dayIn = (list: { s: string; e: string }[]) => (d: Date) => { const k = ymd(d); return list.some((r) => k >= r.s && k < r.e); };
  const modifiers = useMemo(() => ({
    blocked: dayIn(blocks.map((b) => ({ s: b.start_date, e: b.end_date }))),
    booked: dayIn(booked.map((b) => ({ s: b.check_in, e: b.check_out }))),
    priced: (d: Date) => ymd(d) in prices,
  }), [blocks, booked, prices]);

  if (!plan) return null;
  const set = <K extends keyof Plan>(k: K, v: Plan[K]) => setPlan({ ...plan, [k]: v });
  const n = (v: string) => (v === "" ? null : Number(v));

  const saveRules = async () => {
    if (plan.max_nights && plan.max_nights < plan.min_nights) return toast.error("Maximum nights must be at least the minimum");
    if (plan.ical_url && !/^https:\/\//i.test(plan.ical_url)) return toast.error("Calendar link must start with https://");
    setSaving(true);
    const { ical_synced_at, ical_error, price_per_night, ...rest } = plan;
    const { error } = await supabase.from("listings").update(rest).eq("id", listingId);
    setSaving(false);
    if (error) return toast.error("Couldn't save. Check the numbers and try again.");
    toast.success("Price rules saved");
    if (plan.ical_url) { await supabase.functions.invoke("ical-sync", { body: { listing_id: listingId } }); load(); }
  };

  const selDays = () => {
    if (!range?.from) return [];
    const out: string[] = []; let d = range.from; const end = range.to ?? range.from;
    while (d <= end && out.length < 366) { out.push(ymd(d)); d = addDays(d, 1); }
    return out;
  };
  const block = async () => {
    if (!range?.from) return toast.error("Pick dates on the calendar first");
    const { error } = await supabase.from("listing_blocks").insert({ listing_id: listingId, start_date: ymd(range.from), end_date: ymd(addDays(range.to ?? range.from, 1)), source: "host" });
    if (error) return toast.error("Couldn't block those dates");
    toast.success("Dates blocked"); setRange(undefined); load();
  };
  const unblock = async (id: string) => { await supabase.from("listing_blocks").delete().eq("id", id); load(); };
  const applyPrice = async (clear = false) => {
    const days = selDays();
    if (!days.length) return toast.error("Pick dates on the calendar first");
    const { error } = clear
      ? await supabase.from("listing_date_prices").delete().eq("listing_id", listingId).in("date", days)
      : Number(datePrice) > 0
        ? await supabase.from("listing_date_prices").upsert(days.map((date) => ({ listing_id: listingId, date, price: Number(datePrice) })))
        : { error: { message: "price" } };
    if (error) return toast.error(clear ? "Couldn't reset prices" : "Enter a price above 0");
    toast.success(clear ? "Back to normal price" : "Prices set"); setDatePrice(""); setRange(undefined); load();
  };

  return (
    <section className="mt-6 space-y-4 rounded-2xl border border-border p-4">
      <h2 className="text-base font-bold">Prices and calendar</h2>
      <div className="grid grid-cols-2 gap-3">
        <label className="block"><span className="text-xs text-muted-foreground">Weekend price, Fri & Sat (₦)</span>
          <input type="number" min={0} placeholder={`Same as ₦${plan.price_per_night.toLocaleString()}`} value={plan.weekend_price ?? ""} onChange={(e) => set("weekend_price", n(e.target.value))} className={input} /></label>
        <label className="block"><span className="text-xs text-muted-foreground">Cleaning fee, once (₦)</span>
          <input type="number" min={0} value={plan.cleaning_fee} onChange={(e) => set("cleaning_fee", Number(e.target.value) || 0)} className={input} /></label>
        <label className="block"><span className="text-xs text-muted-foreground">Weekly discount, 7+ nights (%)</span>
          <input type="number" min={0} max={90} value={plan.weekly_discount_pct} onChange={(e) => set("weekly_discount_pct", Number(e.target.value) || 0)} className={input} /></label>
        <label className="block"><span className="text-xs text-muted-foreground">Monthly discount, 28+ nights (%)</span>
          <input type="number" min={0} max={90} value={plan.monthly_discount_pct} onChange={(e) => set("monthly_discount_pct", Number(e.target.value) || 0)} className={input} /></label>
        <label className="block"><span className="text-xs text-muted-foreground">Minimum nights</span>
          <input type="number" min={1} value={plan.min_nights} onChange={(e) => set("min_nights", Math.max(1, Number(e.target.value) || 1))} className={input} /></label>
        <label className="block"><span className="text-xs text-muted-foreground">Maximum nights</span>
          <input type="number" min={1} placeholder="No limit" value={plan.max_nights ?? ""} onChange={(e) => set("max_nights", n(e.target.value))} className={input} /></label>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-xs text-muted-foreground mb-1">How guests book</legend>
        {[["instant", "Instant book", "Paid bookings are confirmed straight away."], ["request", "Request to book", "You accept or decline each paid request within 24 hours. No reply means a full refund to the guest."]].map(([v, t, d]) => (
          <label key={v} className="flex gap-3 items-start rounded-xl border border-border p-3 min-h-11 cursor-pointer">
            <input type="radio" name="mode" checked={plan.booking_mode === v} onChange={() => set("booking_mode", v)} className="mt-1" />
            <span><span className="text-sm font-semibold block">{t}</span><span className="text-xs text-muted-foreground">{d}</span></span>
          </label>
        ))}
      </fieldset>
      <label className="block"><span className="text-xs text-muted-foreground">Import another calendar (Airbnb, Booking.com link ending in .ics)</span>
        <input value={plan.ical_url ?? ""} onChange={(e) => set("ical_url", e.target.value.trim() || null)} placeholder="https://…" className={input} />
        {plan.ical_error ? <span className="text-xs text-destructive">Last import failed: {plan.ical_error}</span>
          : plan.ical_synced_at ? <span className="text-xs text-muted-foreground">Last imported {new Date(plan.ical_synced_at).toLocaleString()} · updates every hour</span> : null}
      </label>
      <button onClick={saveRules} disabled={saving} className="w-full min-h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50">{saving ? "Saving…" : "Save price rules"}</button>
      <AccessInstructions listingId={listingId} />


      <div className="border-t border-border pt-4 space-y-3">
        <p className="text-sm font-semibold">Pick dates to block them or set a special price</p>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><i className="w-3 h-3 rounded bg-destructive/30" /> Blocked</span>
          <span className="flex items-center gap-1"><i className="w-3 h-3 rounded bg-primary/30" /> Booked</span>
          <span className="flex items-center gap-1"><i className="w-3 h-3 rounded border-2 border-primary" /> Special price</span>
        </div>
        <Calendar mode="range" numberOfMonths={2} selected={range} onSelect={setRange} disabled={{ before: new Date() }}
          modifiers={modifiers}
          modifiersClassNames={{ blocked: "bg-destructive/30 line-through", booked: "bg-primary/30", priced: "ring-2 ring-primary" }}
          className="rounded-xl border border-border w-fit" />
        {range?.from && (
          <p className="text-xs text-muted-foreground">
            {selDays().length} night{selDays().length > 1 ? "s" : ""} picked · normal price {selDays().slice(0, 1).map((d) => `₦${(prices[d] ?? (isWeekendNight(d) && plan.weekend_price ? plan.weekend_price : plan.price_per_night)).toLocaleString()}`)} for the first night
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button onClick={block} className="min-h-11 px-4 rounded-xl border border-border text-sm font-bold">Block dates</button>
          <input type="number" min={1} value={datePrice} onChange={(e) => setDatePrice(e.target.value)} placeholder="Price ₦" className="min-h-11 w-28 rounded-xl bg-card border border-border px-3 text-sm" />
          <button onClick={() => applyPrice()} className="min-h-11 px-4 rounded-xl border border-border text-sm font-bold">Set price</button>
          <button onClick={() => applyPrice(true)} className="min-h-11 px-4 rounded-xl text-sm text-muted-foreground underline">Reset price</button>
        </div>
        {blocks.length > 0 && (
          <ul className="space-y-1">
            {blocks.map((b) => (
              <li key={b.id} className="flex justify-between items-center text-sm rounded-xl border border-border px-3 py-2">
                <span>{b.start_date} → {format(addDays(new Date(b.end_date + "T00:00:00"), -1), "yyyy-MM-dd")}{b.source === "ical" ? " · imported" : ""}</span>
                {b.source === "host" && <button onClick={() => unblock(b.id)} className="text-xs underline min-h-11 px-2">Unblock</button>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

/** Gate code, key pickup etc. Guests see it only once their booking is confirmed. */
const AccessInstructions = ({ listingId }: { listingId: string }) => {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    supabase.from("listing_private").select("access_instructions").eq("listing_id", listingId).maybeSingle()
      .then(({ data }) => setText(data?.access_instructions ?? ""));
  }, [listingId]);
  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("listing_private").upsert({ listing_id: listingId, access_instructions: text.trim().slice(0, 2000) || null, updated_at: new Date().toISOString() });
    setBusy(false);
    if (error) toast.error("Could not save"); else toast.success("Check-in details saved");
  };
  return (
    <div className="border-t border-border pt-4 space-y-2">
      <label className="block"><span className="text-sm font-semibold">How guests get in</span>
        <span className="block text-xs text-muted-foreground">Gate code, key pickup, parking, Wi-Fi. Guests see this only after their booking is confirmed.</span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} rows={4} className="mt-1 w-full rounded-xl border border-border bg-background p-3 text-sm" /></label>
      <button onClick={save} disabled={busy} className="w-full min-h-11 rounded-xl border border-border text-sm font-semibold disabled:opacity-50">{busy ? "Saving…" : "Save check-in details"}</button>
    </div>
  );
};
