import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { quoteLocalStay } from "../_shared/booking-core.ts";
import { koboToNaira } from "../_shared/rayprop-core.ts";
import { getSetting } from "../_shared/settings.ts";
import { cleanHistory, overlaps, overLimit, ownTripsOnly, placeColumn, type Place } from "../_shared/aria-core.ts";

const HOURLY_LIMIT = 30;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
const naira = (n: number) => "₦" + Math.round(n).toLocaleString();

type Card = { id: string; title: string; area: string; price: number; image: string; source: "local" | "rayprop" };

const systemPrompt = async (signedIn: boolean) => {
  const feeBps = await getSetting<number>("service_fee_bps", 800);
  const support = await getSetting<string>("support_email", "support@stayglobal.app");
  const today = new Date().toISOString().slice(0, 10);
  return `You are Aria, the guest assistant for StayGlobal — a platform for booking shortlet apartments across Nigeria (Lagos, Abuja and more). Today is ${today}.

FACTS (only state these; never invent others):
- Guests browse freely; sign-in is only needed to pay.
- Payment is by card (Paystack) or bank transfer. Money is held safely and released to the host after check-in.
- Service fee: ${feeBps / 100}% on our own stays, shown at checkout. Partner stays show their full price on the stay page.
- Cancellation for our own stays: full refund if cancelled 48 hours or more before check-in, 50% within 48 hours, no refund after check-in.
- Friends can split the payment between 2 and 6 people. Extras like airport pickup can be added to a booking.
- The exact address is shared only after payment; before that only the area is shown.
- Support: ${support}.

TOOLS:
- search_stays for any request to find or compare stays. Always call it; never guess stays or prices. Pass the place exactly as the guest wrote it.
- quote_stay when the guest gives dates for a specific stay.
- my_trips when the guest asks about their own bookings.${signedIn ? "" : " The guest is NOT signed in; ask them to sign in to see their trips."}

STYLE: short, friendly, plain words. The app shows stay cards under your reply automatically, so don't list links or ids; mention names and prices briefly. If nothing matches, say so and suggest a nearby area or a higher budget. Prices are in naira per night.`;
};

const tools = [
  { type: "function", function: { name: "search_stays", description: "Find stays by place, budget, bedrooms and optional dates. Returns up to 6.", parameters: { type: "object", additionalProperties: false, properties: {
    place: { type: "string", description: "Area, city or state as the guest wrote it" },
    max_price: { type: "number", description: "Max naira per night" },
    min_bedrooms: { type: "number" },
    check_in: { type: "string", description: "YYYY-MM-DD" },
    check_out: { type: "string", description: "YYYY-MM-DD" },
  } } } },
  { type: "function", function: { name: "quote_stay", description: "Price for dates for one stay returned by search_stays.", parameters: { type: "object", additionalProperties: false, required: ["id", "check_in", "check_out"], properties: {
    id: { type: "string" }, check_in: { type: "string" }, check_out: { type: "string" },
  } } } },
  { type: "function", function: { name: "my_trips", description: "The signed-in guest's own upcoming and recent bookings.", parameters: { type: "object", additionalProperties: false, properties: {} } } },
];

async function findPlace(text: string): Promise<Place | null> {
  const { data } = await sb.rpc("search_locations", { q: text, _limit: 1 });
  const p = (data as any[])?.[0];
  return p ? { id: p.id, type: p.type, name: p.name } : null;
}

async function searchStays(a: any, cards: Card[]) {
  const place = a.place ? String(a.place).slice(0, 80) : "";
  const p = place ? await findPlace(place) : null;
  const col = p ? placeColumn(p.type) : null;
  const hasDates = DATE.test(a.check_in || "") && DATE.test(a.check_out || "") && a.check_in < a.check_out;

  // Our own stays: picked place OR address text, so "Lekki" also finds stays on the Lekki-Epe expressway.
  let q = sb.from("listings").select("id,title,city,neighborhood,location,price_per_night,bedrooms,images,rating")
    .eq("verified", true).eq("is_available", true).order("price_per_night").limit(20);
  if (place) {
    const safe = place.replace(/[%,()]/g, " ");
    q = q.or([col && p ? `${col}.eq.${p.id}` : "", `location.ilike.%${safe}%`, `city.ilike.%${safe}%`, `neighborhood.ilike.%${safe}%`].filter(Boolean).join(","));
  }
  if (typeof a.max_price === "number") q = q.lte("price_per_night", a.max_price);
  if (typeof a.min_bedrooms === "number") q = q.gte("bedrooms", a.min_bedrooms);
  const { data: local } = await q;
  let localRows = local || [];
  if (hasDates && localRows.length) {
    const free: any[] = [];
    for (const l of localRows) {
      const { data: r } = await sb.rpc("listing_booked_ranges", { _listing_id: l.id });
      if (!(r as any[] || []).some((b) => overlaps(a.check_in, a.check_out, b.check_in, b.check_out))) free.push(l);
      if (free.length >= 4) break;
    }
    localRows = free;
  }

  // Partner stays from the saved RayProp catalogue.
  let partner: any[] = [];
  if (col && p) {
    const { data: ids } = await sb.from("partner_location_map").select("rayprop_listing_id").eq(col, p.id).in("status", ["ok", "confirmed"]).limit(300);
    const list = (ids || []).map((d: any) => d.rayprop_listing_id);
    if (list.length) {
      const { data: recs } = await sb.from("partner_catalogue").select("record").in("rayprop_listing_id", list.slice(0, 300));
      partner = (recs || []).map((r: any) => r.record).filter((r: any) => {
        const price = koboToNaira(r.price_per_night);
        if (!price) return false;
        if (typeof a.max_price === "number" && price > a.max_price) return false;
        if (typeof a.min_bedrooms === "number" && Number(r.bedrooms || 0) < a.min_bedrooms) return false;
        return true;
      }).sort((x: any, y: any) => Number(x.price_per_night) - Number(y.price_per_night));
    }
  }

  const out: Card[] = [
    ...localRows.slice(0, 4).map((l: any) => ({ id: l.id, title: l.title, area: [l.neighborhood, l.city].filter(Boolean).join(", "), price: Number(l.price_per_night), image: (l.images || [])[0] || "", source: "local" as const })),
    ...partner.slice(0, 6 - Math.min(4, localRows.length)).map((r: any) => {
      const imgs = [...(r.listing_images || [])].sort((x: any, y: any) => Number(!!y?.is_primary) - Number(!!x?.is_primary));
      return { id: `rp_${r.id}`, title: r.title, area: [r.neighborhood, r.city].filter(Boolean).join(", "), price: koboToNaira(r.price_per_night), image: imgs[0]?.image_url || r.listing_videos?.[0]?.thumbnail_url || "", source: "rayprop" as const };
    }),
  ];
  cards.push(...out.filter((c) => !cards.some((x) => x.id === c.id)));
  return {
    matched_place: p ? `${p.name} (${p.type})` : null,
    dates_checked: hasDates && "own stays only; partner dates are checked on the stay page",
    results: out.map((c) => ({ id: c.id, title: c.title, area: c.area, price_per_night: naira(c.price), partner: c.source === "rayprop" })),
  };
}

async function quoteStay(a: any) {
  const id = String(a.id || "");
  if (!DATE.test(a.check_in || "") || !DATE.test(a.check_out || "")) return { error: "Dates must be YYYY-MM-DD" };
  if (id.startsWith("rp_")) return { note: "Partner stay: the full price for these dates is shown on its stay page after picking dates." };
  const { data: l } = await sb.from("listings").select("price_per_night,weekend_price,cleaning_fee,weekly_discount_pct,monthly_discount_pct,min_nights,max_nights").eq("id", id).eq("verified", true).maybeSingle();
  if (!l) return { error: "Stay not found" };
  const { data: r } = await sb.rpc("listing_booked_ranges", { _listing_id: id });
  if ((r as any[] || []).some((b) => overlaps(a.check_in, a.check_out, b.check_in, b.check_out))) return { available: false };
  const { data: dp } = await sb.from("listing_date_prices").select("date,price").eq("listing_id", id).gte("date", a.check_in).lt("date", a.check_out);
  const date_prices = Object.fromEntries((dp || []).map((d: any) => [d.date, Number(d.price)]));
  const feeBps = await getSetting<number>("service_fee_bps", 800);
  const qt = quoteLocalStay(a.check_in, a.check_out, { ...l, date_prices } as any, feeBps);
  if (!qt.ok) return { available: true, error: qt.error };
  return { available: true, nights: qt.nights.length, stay: naira(qt.subtotal_kobo / 100), service_fee: naira(qt.fee_kobo / 100), total: naira(qt.total_kobo / 100) };
}

async function myTrips(userId: string | null) {
  if (!userId) return { error: "Not signed in" };
  const { data } = await sb.from("bookings").select("guest_id,status,check_in_date,check_out_date,partner_title,listings(title,city)")
    .eq("guest_id", userId).order("check_in_date", { ascending: false }).limit(5);
  return { trips: ownTripsOnly(data || [], userId).map((b: any) => ({ stay: b.listings?.title || b.partner_title, city: b.listings?.city, check_in: b.check_in_date, check_out: b.check_out_date, status: b.status })) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const history = cleanHistory(body?.messages);
    if (!history.length || history[history.length - 1].role !== "user") return json({ error: "Send a message" });

    // Who is asking: verified user, else a device id from the browser, else the network address.
    let userId: string | null = null;
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer /, "");
    if (token) { const { data } = await sb.auth.getUser(token); userId = data.user?.id ?? null; }
    const device = typeof body?.device === "string" ? body.device.slice(0, 64) : "";
    const actor = userId ? `u:${userId}` : device ? `d:${device}` : `ip:${(req.headers.get("x-forwarded-for") || "").split(",")[0]}`;
    const since = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await sb.from("aria_usage").select("id", { count: "exact", head: true }).eq("actor", actor).gte("created_at", since);
    if (overLimit(count || 0, HOURLY_LIMIT)) return json({ error: "limit", reply: "You've sent a lot of messages in the last hour. Please try again a little later." });
    await sb.from("aria_usage").insert({ actor });

    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) throw new Error("LOVABLE_API_KEY missing");
    const convo: any[] = [{ role: "system", content: await systemPrompt(!!userId) }, ...history];
    const cards: Card[] = [];

    for (let i = 0; i < 4; i++) {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: convo, tools }),
      });
      if (resp.status === 429) return json({ error: "Rate limited" });
      if (resp.status === 402) return json({ error: "Payment required" });
      if (!resp.ok) { console.error("AI gateway error", resp.status, await resp.text()); return json({ error: "AI gateway error" }); }
      const msg = (await resp.json()).choices?.[0]?.message;
      if (!msg) break;
      if (msg.tool_calls?.length) {
        convo.push(msg);
        for (const tc of msg.tool_calls) {
          let args: any = {};
          try { args = JSON.parse(tc.function?.arguments || "{}"); } catch { /* empty args */ }
          const name = tc.function?.name;
          const result = name === "search_stays" ? await searchStays(args, cards)
            : name === "quote_stay" ? await quoteStay(args)
            : name === "my_trips" ? await myTrips(userId)
            : { error: "Unknown tool" };
          convo.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
        }
        continue;
      }
      return json({ reply: msg.content ?? "", cards: cards.slice(0, 6) });
    }
    return json({ reply: "Sorry, I couldn't finish that. Could you try asking another way?", cards: cards.slice(0, 6) });
  } catch (e) {
    console.error("aria-chat error:", e);
    return json({ error: "Aria is unavailable right now" });
  }
});
