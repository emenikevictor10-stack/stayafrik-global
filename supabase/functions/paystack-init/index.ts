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

    const key = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!key) return json(500, { error: "Paystack is not configured" });

    const reference = `STAY_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

    const r = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        amount: amountKobo,
        currency: "NGN",
        reference,
        callback_url,
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
        },
      }),
    });
    const j = await r.json();
    if (!r.ok || !j.status) return json(400, { error: j.message || "Could not initialize payment" });

    return json(200, {
      authorization_url: j.data.authorization_url,
      reference: j.data.reference,
      total,
      nights,
    });
  } catch (e) {
    return json(500, { error: (e as Error).message });
  }
});
