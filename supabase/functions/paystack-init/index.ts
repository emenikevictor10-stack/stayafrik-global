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
      const r = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: { Authorization: `Bearer ${pkey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email, amount: amountKobo, currency: "NGN", reference, callback_url,
          channels: ["card", "bank", "ussd", "bank_transfer", "qr", "mobile_money"],
          metadata: {
            source: "rayprop", user_id: userId, rayprop_listing_id: String(listing_id).replace(/^rp_/, ""),
            quote_id, hold_id, amount_kobo: amountKobo, check_in, check_out, guests,
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
      .select("id, price_per_night, title, is_available")
      .eq("id", listing_id)
      .maybeSingle();
    if (lerr || !listing) return json(404, { error: "Listing not found" });
    if (!listing.is_available) return json(400, { error: "Listing is not available" });

    const ci = new Date(check_in).getTime();
    const co = new Date(check_out).getTime();
    if (!ci || !co || co <= ci) return json(400, { error: "Invalid dates" });
    const nights = Math.max(1, Math.round((co - ci) / 86400000));
    const subtotal = Number(listing.price_per_night) * nights;
    const fees = Math.round(subtotal * 0.08);
    const total = subtotal + fees;
    const amountKobo = Math.round(total * 100);

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
      return json(502, { error: "Could not reach Paystack. Please try again." });
    }

    const j = await r.json().catch(() => ({} as any));
    console.log(`[paystack-init] paystack_status=${r.status} ok=${j?.status} msg=${j?.message}`);

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
    });
  } catch (e) {
    console.error("[paystack-init] fatal", e);
    return json(500, { error: (e as Error).message });
  }
});
