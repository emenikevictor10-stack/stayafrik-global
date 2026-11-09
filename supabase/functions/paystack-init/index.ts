import { getSetting } from "../_shared/settings.ts";
import { expiresAt, nightlyBreakdown, quoteLocalStay, splitShares } from "../_shared/booking-core.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { raypropGetHold, raypropGetQuote, unwrapRayProp } from "../_shared/rayprop.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (s: number, b: unknown) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authErr } = await supabase.auth.getClaims(token);
    if (authErr || !claims?.claims) return json(401, { error: "Unauthorized" });
    const userId = claims.claims.sub as string;
    const email = (claims.claims.email as string | undefined) ?? "guest@stay.app";

    const body = await req.json().catch(() => ({}));
    const svcEarly = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const startPaystack = async (amount: number, reference: string, cb: string, metadata: Record<string, unknown>) => {
      const k = Deno.env.get("PAYSTACK_SECRET_KEY")?.trim();
      if (!k) return { error: "Paystack is not configured" } as const;
      const r = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST", headers: { Authorization: `Bearer ${k}`, "Content-Type": "application/json" },
        body: JSON.stringify({ email, amount, currency: "NGN", reference, callback_url: cb, metadata: { user_id: userId, ...metadata } }),
      }).catch(() => null);
      const j = r ? await r.json().catch(() => ({} as any)) : {};
      if (!r?.ok || !j?.status) return { error: j?.message || "Paystack could not start this payment" } as const;
      return { access_code: j.data.access_code as string, reference: j.data.reference as string, authorization_url: j.data.authorization_url as string };
    };
    const okCb = (u: unknown) => typeof u === "string" && /^https?:\/\//.test(u);

    // ---------- Add-on for a confirmed trip (price from the catalogue, never the client) ----------
    if (body.mode === "addon") {
      const qty = Math.min(20, Math.max(1, Math.floor(Number(body.qty) || 1)));
      if (!okCb(body.callback_url)) return json(400, { error: "Missing callback" });
      const { data: b } = await svcEarly.from("bookings").select("id,guest_id,status").eq("id", String(body.booking_id || "")).maybeSingle();
      if (!b || b.guest_id !== userId) return json(404, { error: "Trip not found" });
      if (!["confirmed", "awaiting_host"].includes(b.status)) return json(400, { error: "Add-ons are for confirmed trips" });
      const { data: a } = await svcEarly.from("addons").select("id,name,price_kobo,active").eq("id", String(body.addon_id || "")).maybeSingle();
      if (!a?.active) return json(404, { error: "That add-on isn't available" });
      const amount = Number(a.price_kobo) * qty;
      const reference = `STAYADD_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
      const { error: oe } = await svcEarly.from("addon_orders").insert({
        booking_id: b.id, guest_id: userId, addon_id: a.id, addon_name: a.name, qty, amount_kobo: amount, reference,
        note: body.note ? String(body.note).slice(0, 300) : null,
      });
      if (oe) return json(500, { error: "Could not save your order" });
      const p = await startPaystack(amount, reference, body.callback_url, { kind: "addon", booking_id: b.id });
      if ("error" in p) { await svcEarly.from("addon_orders").update({ status: "cancelled" }).eq("reference", reference); return json(400, p); }
      return json(200, { ...p, total: amount / 100 });
    }

    // ---------- A friend paying their share of a split booking ----------
    if (body.mode === "share") {
      if (!okCb(body.callback_url)) return json(400, { error: "Missing callback" });
      const { data: s } = await svcEarly.from("payment_shares").select("id,booking_id,amount_kobo,status,payer_user_id").eq("token", String(body.token || "")).maybeSingle();
      if (!s) return json(404, { error: "This payment link isn't valid" });
      if (s.status !== "pending") return json(409, { error: "This share is already paid" });
      if (s.payer_user_id && s.payer_user_id !== userId) return json(403, { error: "Someone else is paying this share" });
      const { data: b } = await svcEarly.from("bookings").select("status,hold_expires_at").eq("id", s.booking_id).maybeSingle();
      if (!b || b.status !== "held" || new Date(b.hold_expires_at).getTime() < Date.now()) return json(409, { error: "This booking is no longer waiting for payment" });
      const reference = `STAYSHR_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
      await svcEarly.from("payment_shares").update({ reference, payer_user_id: userId }).eq("id", s.id).eq("status", "pending");
      const p = await startPaystack(Number(s.amount_kobo), reference, body.callback_url, { kind: "share", booking_id: s.booking_id });
      if ("error" in p) return json(400, p);
      return json(200, { ...p, total: Number(s.amount_kobo) / 100 });
    }

    const listing_id = String(body.listing_id || "");
    const check_in = String(body.check_in || "");
    const check_out = String(body.check_out || "");
    const guests = Number(body.guests || 1);
    const callback_url = String(body.callback_url || "");

    if (!listing_id || !check_in || !check_out || !callback_url) {
      return json(400, { error: "Missing required fields" });
    }

    // ---------- Partner (RayProp) stays: charge the server-verified quote total ----------
    if (body.source === "rayprop") {
      const quote_id = String(body.quote_id || "");
      const hold_id = String(body.hold_id || "");
      const g = body.guest || {};
      if (!quote_id || !hold_id || !g.name || !g.email || !g.phone) return json(400, { error: "Missing partner booking details" });
      let quote: any, hold: any;
      try {
        quote = unwrapRayProp(await raypropGetQuote(quote_id));
        hold = unwrapRayProp(await raypropGetHold(hold_id));
      } catch (e) {
        return json(409, { error: (e as Error).message || "Your price or hold expired. Please get a new price." });
      }
      if (quote?.status && quote.status !== "valid") return json(409, { error: "Your price expired. Please get a new price." });
      if (hold?.status && hold.status !== "active") return json(409, { error: "Your hold expired. Please get a new price." });
      const amountKobo = Math.round(Number(quote?.pricing?.total_amount || 0));
      if (!amountKobo) return json(400, { error: "Invalid partner price" });
      const pkey = Deno.env.get("PAYSTACK_SECRET_KEY")?.trim();
      if (!pkey) return json(500, { error: "Paystack is not configured" });
      const reference = `STAYRP_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
      const title = String(body.title || quote?.listing?.title || "Partner stay").slice(0, 200);
      const pNights = nightlyBreakdown(check_in, check_out, 0).length || 1;
      const markupNight = Math.max(0, await getSetting<number>("markup_per_night_kobo", 0));
      const markupKobo = Math.round(Number(quote?.pricing?.developer_markup_total ?? markupNight * pNights)) || 0;
      const r = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: { Authorization: `Bearer ${pkey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email, amount: amountKobo, currency: "NGN", reference, callback_url,
          channels: ["card", "bank", "ussd", "bank_transfer", "qr", "mobile_money"],
          metadata: {
            source: "rayprop", user_id: userId, rayprop_listing_id: String(listing_id).replace(/^rp_/, ""),
            quote_id, hold_id, amount_kobo: amountKobo, markup_kobo: markupKobo, check_in, check_out, guests,
            title, image: String(body.image || "").slice(0, 500), city: String(body.city || quote?.listing?.city || "").slice(0, 80),
            hold_expires_at: hold?.expires_at || null,
            guest_name: String(g.name).slice(0, 120), guest_email: String(g.email).slice(0, 254), guest_phone: String(g.phone).slice(0, 20),
            custom_fields: [{ display_name: "Stay", variable_name: "listing", value: title }],
          },
        }),
      });
      const j = await r.json().catch(() => ({} as any));
      if (!r.ok || !j?.status) return json(400, { error: j?.message || "Paystack could not start this payment" });
      return json(200, { access_code: j.data.access_code, reference: j.data.reference, total: amountKobo / 100 });
    }

    // Re-compute price server-side from the listing (never trust client totals)
    const { data: listing, error: lerr } = await supabase
      .from("listings")
      .select("id, price_per_night, title, is_available, host_id, weekend_price, cleaning_fee, weekly_discount_pct, monthly_discount_pct, min_nights, max_nights")
      .eq("id", listing_id)
      .maybeSingle();
    if (lerr || !listing) return json(404, { error: "Listing not found" });
    if (!listing.is_available) return json(400, { error: "Listing is not available" });
    {
      const { data: hs } = await createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!).from("host_status").select("status").eq("host_id", listing.host_id).maybeSingle();
      if (hs?.status === "suspended") return json(400, { error: "Listing is not available" });
    }

    const ci = new Date(check_in).getTime();
    const co = new Date(check_out).getTime();
    if (!ci || !co || co <= ci) return json(400, { error: "Invalid dates" });

    const { data: dp } = await supabase.from("listing_date_prices").select("date, price")
      .eq("listing_id", listing_id).gte("date", check_in).lt("date", check_out);
    const feeBps = await getSetting<number>("service_fee_bps", 800);
    const q = quoteLocalStay(check_in, check_out, {
      ...listing, price_per_night: Number(listing.price_per_night),
      date_prices: Object.fromEntries((dp ?? []).map((r: any) => [r.date, Number(r.price)])),
    }, feeBps);
    if (!q.ok) return json(400, { error: q.error });
    // Host-blocked or calendar-imported nights are refused here too, not just in the picker.
    // (Overlapping bookings are refused by the database constraint when the hold is inserted.)
    const { data: blk } = await createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
      .from("listing_blocks").select("id").eq("listing_id", listing_id).lt("start_date", check_out).gt("end_date", check_in).limit(1);
    const clash = (blk ?? []).length > 0;
    if (clash) return json(409, { error: "Some of those nights are not available — please pick different dates." });
    const breakdown = q.nights;
    const nights = breakdown.length;
    const split = q;
    const subtotal = split.subtotal_kobo / 100;
    const fees = split.fee_kobo / 100;
    const total = split.total_kobo / 100;
    const amountKobo = split.total_kobo;

    const key = Deno.env.get("PAYSTACK_SECRET_KEY")?.trim();
    if (!key) return json(500, { error: "Paystack is not configured" });

    // Validate Paystack key format
    const isTestKey = key.startsWith("sk_test_");
    const isLiveKey = key.startsWith("sk_live_");
    if (!isTestKey && !isLiveKey) {
      return json(500, {
        error: "Invalid Paystack secret key format. It must start with sk_test_ or sk_live_.",
      });
    }
    const mode = isLiveKey ? "live" : "test";
    console.log(`[paystack-init] mode=${mode} key_prefix=${key.slice(0, 10)} user=${userId} amount_ngn=${total}`);

    const reference = `STAY_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

    // Hold the nights first. The database refuses overlapping active bookings (bookings_no_overlap).
    const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    // Free nights whose hold ran out (the hourly job also does this), so they never block a new guest.
    await svc.rpc("expire_stale_holds", { _listing_id: listing_id });
    // A retry by the same guest replaces their own earlier hold on this stay.
    await svc.from("bookings").update({ status: "cancelled" })
      .eq("guest_id", userId).eq("listing_id", listing_id).eq("status", "held");
    const now = new Date();
    const holdMin = await getSetting<number>("hold_minutes", 15);
    const payMin = await getSetting<number>("payment_window_minutes", 60);
    const splitCount = Math.floor(Number(body.split_count) || 0);
    if (splitCount >= 2) {
      if (splitCount > 8) return json(400, { error: "Split between at most 8 people" });
      const splitHours = Math.max(1, await getSetting<number>("split_hold_hours", 6));
      const groupRef = `STAYSPLIT_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
      const { data: hb, error: he } = await svc.from("bookings").insert({
        guest_id: userId, listing_id, host_id: listing.host_id, source: "stayglobal", status: "held", is_split: true,
        check_in_date: check_in, check_out_date: check_out, guest_count: guests, total_price: total, payment_reference: groupRef,
        hold_expires_at: expiresAt(now, splitHours * 60).toISOString(), payment_expires_at: expiresAt(now, splitHours * 60).toISOString(),
        nightly_breakdown: breakdown, subtotal_kobo: split.subtotal_kobo, fee_kobo: split.fee_kobo,
        host_payout_kobo: split.host_payout_kobo, cleaning_fee_kobo: split.cleaning_kobo, discount_kobo: split.discount_kobo,
      }).select("id, hold_expires_at").single();
      if (he) return json(he.code === "23P01" ? 409 : 500, { error: he.code === "23P01" ? "Those dates were just booked — please pick different dates." : "Could not hold your dates." });
      const amounts = splitShares(amountKobo, splitCount);
      const shares = amounts.map((amt, i) => ({
        booking_id: hb.id, share_no: i + 1, amount_kobo: amt,
        token: crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().slice(0, 8),
        payer_user_id: i === 0 ? userId : null, label: i === 0 ? "You" : `Person ${i + 1}`,
      }));
      const { error: se } = await svc.from("payment_shares").insert(shares);
      if (se) { await svc.from("bookings").update({ status: "cancelled" }).eq("id", hb.id); return json(500, { error: "Could not set up the split" }); }
      const ref = `STAYSHR_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
      await svc.from("payment_shares").update({ reference: ref }).eq("booking_id", hb.id).eq("share_no", 1);
      const p = await startPaystack(shares[0].amount_kobo, ref, callback_url, { kind: "share", booking_id: hb.id });
      if ("error" in p) { await svc.from("bookings").update({ status: "cancelled" }).eq("id", hb.id); return json(400, p); }
      return json(200, { ...p, total: shares[0].amount_kobo / 100, booking_id: hb.id, hold_expires_at: hb.hold_expires_at, split: true });
    }
    const { data: held, error: herr } = await svc.from("bookings").insert({
      guest_id: userId, listing_id, host_id: listing.host_id, source: "stayglobal", status: "held",
      check_in_date: check_in, check_out_date: check_out, guest_count: guests,
      total_price: total, payment_reference: reference,
      hold_expires_at: expiresAt(now, holdMin).toISOString(),
      payment_expires_at: expiresAt(now, Math.max(payMin, holdMin)).toISOString(),
      nightly_breakdown: breakdown, subtotal_kobo: split.subtotal_kobo, fee_kobo: split.fee_kobo,
      host_payout_kobo: split.host_payout_kobo, cleaning_fee_kobo: split.cleaning_kobo, discount_kobo: split.discount_kobo,
    }).select("id, hold_expires_at").single();
    if (herr) {
      if (herr.code === "23P01") return json(409, { error: "Those dates were just booked — please pick different dates." });
      console.error("[paystack-init] hold failed", herr);
      return json(500, { error: "Could not hold your dates. Please try again." });
    }
    const dropHold = () => svc.from("bookings").update({ status: "cancelled" }).eq("id", held.id).eq("status", "held");

    let r: Response;
    try {
      r = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          amount: amountKobo,
          currency: "NGN",
          reference,
          callback_url,
          channels: ["card", "bank", "ussd", "bank_transfer", "qr", "mobile_money"],
          metadata: {
            user_id: userId,
            listing_id,
            listing_title: listing.title,
            check_in,
            check_out,
            guests,
            nights,
            subtotal,
            fees,
            total,
            custom_fields: [
              { display_name: "Listing", variable_name: "listing", value: listing.title },
              { display_name: "Check-in", variable_name: "check_in", value: check_in },
              { display_name: "Check-out", variable_name: "check_out", value: check_out },
              { display_name: "Guests", variable_name: "guests", value: String(guests) },
            ],
          },
        }),
      });
    } catch (e) {
      console.error("[paystack-init] network error", e);
      await dropHold();
      return json(502, { error: "Could not reach Paystack. Please try again." });
    }

    const j = await r.json().catch(() => ({} as any));
    console.log(`[paystack-init] paystack_status=${r.status} ok=${j?.status} msg=${j?.message}`);

    if (r.status === 401 || !r.ok || !j?.status) await dropHold();
    if (r.status === 401) {
      return json(401, {
        error:
          "Paystack rejected the secret key (401 Unauthorized). The key may be invalid, revoked, or from a different account. Paste the secret key (not the public key) from your Paystack Dashboard → Settings → API Keys & Webhooks.",
        mode,
      });
    }
    if (!r.ok || !j?.status) {
      return json(400, {
        error:
          j?.message ||
          `Paystack rejected this transaction (HTTP ${r.status}). If you're on a live key, your business may not yet be activated for live payments, or this transaction was blocked by Paystack's fraud system.`,
        mode,
        paystack_status: r.status,
      });
    }

    return json(200, {
      authorization_url: j.data.authorization_url,
      access_code: j.data.access_code,
      reference: j.data.reference,
      total,
      nights,
      mode,
      booking_id: held.id,
      hold_expires_at: held.hold_expires_at,
    });
  } catch (e) {
    console.error("[paystack-init] fatal", e);
    return json(500, { error: (e as Error).message });
  }
});
