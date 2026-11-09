import { getSetting } from "../_shared/settings.ts";
import { idAllowsPayment } from "../_shared/guest-id-core.ts";
import { blockedMessage, isBlocked } from "../_shared/user-block-core.ts";
import { expiresAt, nightlyBreakdown, quoteLocalStay, splitShares, validateCustomShares, SPLIT_MAX_PEOPLE } from "../_shared/booking-core.ts";
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
    {
      const { data: us } = await svcEarly.from("user_status").select("blocked_at").eq("user_id", userId).maybeSingle();
      if (isBlocked(us)) {
        const support = await getSetting<string>("support_email", "support@stayglobal.app");
        return json(403, { error: blockedMessage(support), code: "blocked" });
      }
      // Rate limit: at most 10 payment starts per guest per 10 minutes.
      const since = new Date(Date.now() - 10 * 60_000).toISOString();
      const { count } = await svcEarly.from("bookings").select("id", { count: "exact", head: true }).eq("guest_id", userId).gte("created_at", since);
      if ((count ?? 0) >= 10) return json(429, { error: "Too many payment attempts. Please wait a few minutes and try again.", code: "rate_limited" });
    }
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
    const isBank = body.method === "bank_transfer";
    const bankDetails = async () => {
      const f = await getSetting<Record<string, boolean>>("features", {} as any);
      if (f && (f as any).bank_transfer === false) return null;
      const number = (await getSetting<string>("bank_transfer_number", "")).trim();
      if (!number) return null;
      return { bank: await getSetting<string>("bank_transfer_bank", ""), number, name: await getSetting<string>("bank_transfer_name", "") };
    };
    const bankMinutes = async () => Math.max(15, await getSetting<number>("bank_transfer_hold_minutes", 120));

    // ---------- Add-on for a confirmed trip (price from the catalogue, never the client) ----------
    if (body.mode === "addon") {
      const qty = Math.min(20, Math.max(1, Math.floor(Number(body.qty) || 1)));
      if (!isBank && !okCb(body.callback_url)) return json(400, { error: "Missing callback" });
      const { data: b } = await svcEarly.from("bookings").select("id,guest_id,status,check_in_date,listing_id,rayprop_listing_id,partner_title,listings(title,city_id)").eq("id", String(body.booking_id || "")).maybeSingle();
      if (!b || b.guest_id !== userId) return json(404, { error: "Trip not found" });
      const today = new Date(Date.now() + 3600_000).toISOString().slice(0, 10); // Lagos (UTC+1)
      if (!["confirmed", "awaiting_host"].includes(b.status) || b.check_in_date < today) return json(400, { error: "Extras can only be added to confirmed trips before check-in" });
      const { data: a } = await svcEarly.from("addons").select("id,name,price_kobo,active,city_id").eq("id", String(body.addon_id || "")).maybeSingle();
      if (!a?.active) return json(404, { error: "That add-on isn't available" });
      if (a.city_id) {
        let cityId: string | null = (b as any).listings?.city_id ?? null;
        if (!cityId && b.rayprop_listing_id) {
          const { data: m } = await svcEarly.from("partner_location_map").select("city_id").eq("rayprop_listing_id", b.rayprop_listing_id).maybeSingle();
          cityId = m?.city_id ?? null;
        }
        if (cityId !== a.city_id) return json(400, { error: "That extra isn't offered in this city" });
      }
      const amount = Number(a.price_kobo) * qty;
      const reference = isBank ? `STAYBT_${Date.now()}_${crypto.randomUUID().slice(0, 6).toUpperCase()}` : `STAYADD_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
      const acct = isBank ? await bankDetails() : null;
      if (isBank && !acct) return json(400, { error: "Bank transfer is not available right now" });
      const { data: ord, error: oe } = await svcEarly.from("addon_orders").insert({
        booking_id: b.id, guest_id: userId, addon_id: a.id, addon_name: a.name, qty, amount_kobo: amount, reference,
        note: body.note ? String(body.note).slice(0, 300) : null, pay_method: isBank ? "bank_transfer" : "card",
      }).select("id").single();
      if (oe) return json(500, { error: "Could not save your order" });
      if (isBank) {
        const exp = expiresAt(new Date(), await bankMinutes()).toISOString();
        const { data: bt, error: be } = await svcEarly.from("bank_transfers").insert({
          booking_id: b.id, guest_id: userId, amount_kobo: amount, reference, source: "stayglobal", // extras are approved by staff directly, even on partner stays
          title: `${a.name} × ${qty} — ${(b as any).listings?.title ?? b.partner_title ?? "your stay"}`, check_in: b.check_in_date,
          expires_at: exp, meta: { account: acct, addon_order_id: ord.id },
        }).select("id").single();
        if (be) { await svcEarly.from("addon_orders").update({ status: "cancelled" }).eq("id", ord.id); return json(500, { error: "Could not start the bank transfer." }); }
        return json(200, { bank_transfer: { id: bt.id, reference, amount: amount / 100, expires_at: exp, account: acct } });
      }
      const p = await startPaystack(amount, reference, body.callback_url, { kind: "addon", booking_id: b.id });
      if ("error" in p) { await svcEarly.from("addon_orders").update({ status: "cancelled" }).eq("reference", reference); return json(400, p); }
      return json(200, { ...p, total: amount / 100 });
    }

    // ---------- A friend paying their share of a split booking ----------
    if (body.mode === "share") {
      if (!isBank && !okCb(body.callback_url)) return json(400, { error: "Missing callback" });
      const { data: s } = await svcEarly.from("payment_shares").select("id,booking_id,amount_kobo,status,payer_user_id,reference").eq("token", String(body.token || "")).maybeSingle();
      if (!s || s.status === "void") return json(404, { error: "This payment link isn't valid" });
      if (s.status !== "pending") return json(409, { error: "This share is already paid" });
      if (s.payer_user_id && s.payer_user_id !== userId) return json(403, { error: "Someone else is paying this share" });
      const { data: b } = await svcEarly.from("bookings").select("status,hold_expires_at").eq("id", s.booking_id).maybeSingle();
      if (!b || b.status !== "held" || new Date(b.hold_expires_at).getTime() < Date.now()) return json(409, { error: "This booking is no longer waiting for payment" });
      if (s.reference) {
        const { data: open } = await svcEarly.from("bank_transfers").select("id,status").eq("reference", s.reference).in("status", ["awaiting_proof", "submitted"]).maybeSingle();
        if (open?.status === "submitted") return json(409, { error: "A bank transfer for this share is being checked" });
        if (open && isBank) return json(200, { bank_transfer: { id: open.id } });
        if (open) await svcEarly.from("bank_transfers").update({ status: "expired" }).eq("id", open.id).eq("status", "awaiting_proof");
      }
      if (isBank) {
        const acct = await bankDetails();
        if (!acct) return json(400, { error: "Bank transfer is not available right now" });
        const { data: bk } = await svcEarly.from("bookings").select("listing_id,check_in_date,check_out_date,listings(title)").eq("id", s.booking_id).maybeSingle();
        const ref = `STAYBT_${Date.now()}_${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
        const exp = new Date(Math.min(new Date(b.hold_expires_at).getTime(), expiresAt(new Date(), await bankMinutes()).getTime())).toISOString();
        const { data: bt, error: be } = await svcEarly.from("bank_transfers").insert({
          booking_id: s.booking_id, guest_id: userId, amount_kobo: Number(s.amount_kobo), reference: ref,
          title: (bk as any)?.listings?.title ?? "Your share", check_in: bk?.check_in_date, check_out: bk?.check_out_date,
          expires_at: exp, meta: { account: acct, share_id: s.id },
        }).select("id").single();
        if (be) return json(500, { error: "Could not start the bank transfer." });
        await svcEarly.from("payment_shares").update({ reference: ref, payer_user_id: userId, pay_method: "bank_transfer" }).eq("id", s.id).eq("status", "pending");
        return json(200, { bank_transfer: { id: bt.id, reference: ref, amount: Number(s.amount_kobo) / 100, expires_at: exp, account: acct } });
      }
      const reference = `STAYSHR_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
      await svcEarly.from("payment_shares").update({ reference, payer_user_id: userId, pay_method: "card" }).eq("id", s.id).eq("status", "pending");
      const p = await startPaystack(Number(s.amount_kobo), reference, body.callback_url, { kind: "share", booking_id: s.booking_id });
      if ("error" in p) return json(400, p);
      return json(200, { ...p, total: Number(s.amount_kobo) / 100 });
    }

    const listing_id = String(body.listing_id || "");
    const check_in = String(body.check_in || "");
    const check_out = String(body.check_out || "");
    const guests = Number(body.guests || 1);
    const callback_url = String(body.callback_url || "");

    if (!listing_id || !check_in || !check_out || (!callback_url && !isBank)) {
      return json(400, { error: "Missing required fields" });
    }

    // ---------- ID switch (PRD §3): checked on the server for every stay payment ----------
    {
      const feats = await getSetting<Record<string, boolean>>("features", {} as any);
      if (feats.id_required) {
        const { data: k } = await svcEarly.from("kyc_submissions").select("status").eq("user_id", userId).maybeSingle();
        if (!idAllowsPayment(k?.status, true)) return json(403, { error: "Add your ID to book", code: "id_required" });
      }
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
      if (isBank) {
        const acct = await bankDetails();
        if (!acct) return json(400, { error: "Bank transfer is not available right now." });
        const ref = `STAYBT_${Date.now()}_${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
        const title = String(body.title || quote?.listing?.title || "Partner stay").slice(0, 200);
        const pN = nightlyBreakdown(check_in, check_out, 0).length || 1;
        const mN = Math.max(0, await getSetting<number>("markup_per_night_kobo", 0));
        const expires = expiresAt(new Date(), await bankMinutes()).toISOString();
        const { data: bt, error: be } = await svcEarly.from("bank_transfers").insert({
          guest_id: userId, source: "rayprop", amount_kobo: amountKobo, reference: ref, title, check_in, check_out, expires_at: expires,
          meta: {
            account: acct,
            rayprop_listing_id: String(listing_id).replace(/^rp_/, ""), quote_id, hold_id, guests,
            markup_kobo: Math.round(Number(quote?.pricing?.developer_markup_total ?? mN * pN)) || 0,
            image: String(body.image || "").slice(0, 500), city: String(body.city || quote?.listing?.city || "").slice(0, 80),
            guest_name: String(g.name).slice(0, 120), guest_email: String(g.email).slice(0, 254), guest_phone: String(g.phone).slice(0, 20),
          },
        }).select("id").single();
        if (be) return json(500, { error: "Could not start the bank transfer. Please try again." });
        return json(200, { bank_transfer: { id: bt.id, reference: ref, amount: amountKobo / 100, expires_at: expires, account: acct, partner: true } });
      }
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

    if (isBank) {
      const acct = await bankDetails();
      if (!acct) return json(400, { error: "Bank transfer is not available right now." });
      const svcB = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await svcB.rpc("expire_stale_holds", { _listing_id: listing_id });
      {
      // Replace this guest's own unpaid hold, but never one whose transfer receipt is being checked.
      const { data: mine } = await svcB.from("bookings").select("id").eq("guest_id", userId).eq("listing_id", listing_id).eq("status", "held");
      const ids = (mine ?? []).map((r: any) => r.id);
      const { data: busy } = ids.length ? await svcB.from("bank_transfers").select("booking_id").in("booking_id", ids).eq("status", "submitted") : { data: [] };
      const keep = new Set((busy ?? []).map((r: any) => r.booking_id));
      const drop = ids.filter((i: string) => !keep.has(i));
      if (drop.length) await svcB.from("bookings").update({ status: "cancelled" }).in("id", drop).eq("status", "held");
    }
      const ref = `STAYBT_${Date.now()}_${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
      const expires = expiresAt(new Date(), await bankMinutes()).toISOString();
      const { data: hb, error: he } = await svcB.from("bookings").insert({
        guest_id: userId, listing_id, host_id: listing.host_id, source: "stayglobal", status: "held",
        check_in_date: check_in, check_out_date: check_out, guest_count: guests, total_price: total, payment_reference: ref,
        hold_expires_at: expires, payment_expires_at: expires,
        nightly_breakdown: breakdown, subtotal_kobo: split.subtotal_kobo, fee_kobo: split.fee_kobo,
        host_payout_kobo: split.host_payout_kobo, cleaning_fee_kobo: split.cleaning_kobo, discount_kobo: split.discount_kobo,
      }).select("id").single();
      if (he) return json(he.code === "23P01" ? 409 : 500, { error: he.code === "23P01" ? "Those dates were just booked — please pick different dates." : "Could not hold your dates." });
      const { data: bt, error: be } = await svcB.from("bank_transfers").insert({
        booking_id: hb.id, guest_id: userId, amount_kobo: amountKobo, reference: ref, title: listing.title, check_in, check_out, expires_at: expires, meta: { account: acct },
      }).select("id").single();
      if (be) { await svcB.from("bookings").update({ status: "cancelled" }).eq("id", hb.id); return json(500, { error: "Could not start the bank transfer." }); }
      return json(200, { bank_transfer: { id: bt.id, reference: ref, amount: total, expires_at: expires, account: acct, booking_id: hb.id } });
    }

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
{
      // Replace this guest's own unpaid hold, but never one whose transfer receipt is being checked.
      const { data: mine } = await svc.from("bookings").select("id").eq("guest_id", userId).eq("listing_id", listing_id).eq("status", "held");
      const ids = (mine ?? []).map((r: any) => r.id);
      const { data: busy } = ids.length ? await svc.from("bank_transfers").select("booking_id").in("booking_id", ids).eq("status", "submitted") : { data: [] };
      const keep = new Set((busy ?? []).map((r: any) => r.booking_id));
      const drop = ids.filter((i: string) => !keep.has(i));
      if (drop.length) await svc.from("bookings").update({ status: "cancelled" }).in("id", drop).eq("status", "held");
    }
    const now = new Date();
    const holdMin = await getSetting<number>("hold_minutes", 15);
    const payMin = await getSetting<number>("payment_window_minutes", 60);
    const custom = Array.isArray(body.shares) ? (body.shares as any[]).map((x) => ({
      amount_kobo: Math.round(Number(x?.amount_kobo)), name: x?.name ? String(x.name).trim().slice(0, 80) : null,
      phone: x?.phone ? String(x.phone).trim().slice(0, 30) : null, email: x?.email ? String(x.email).trim().toLowerCase().slice(0, 120) : null,
    })) : null;
    const splitCount = custom ? custom.length : Math.floor(Number(body.split_count) || 0);
    if (splitCount >= 2 || custom) {
      if (splitCount > SPLIT_MAX_PEOPLE || splitCount < 2) return json(400, { error: "Split between 2 and 6 people" });
      if (custom) { const err = validateCustomShares(amountKobo, custom); if (err) return json(400, { error: err }); }
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
      const amounts = custom ? custom.map((c) => c.amount_kobo) : splitShares(amountKobo, splitCount);
      const people = Array.isArray(body.people) ? body.people as any[] : [];
      const shares = amounts.map((amt, i) => ({
        booking_id: hb.id, share_no: i + 1, amount_kobo: amt, pay_method: i === 0 ? "card" : null,
        name: i === 0 ? null : (custom?.[i]?.name ?? (people[i]?.name ? String(people[i].name).trim().slice(0, 80) : null)),
        phone: i === 0 ? null : (custom?.[i]?.phone ?? (people[i]?.phone ? String(people[i].phone).trim().slice(0, 30) : null)),
        email: i === 0 ? null : (custom?.[i]?.email ?? (people[i]?.email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(people[i].email)) ? String(people[i].email).trim().toLowerCase().slice(0, 120) : null)),
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
