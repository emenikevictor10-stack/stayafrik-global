import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

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
