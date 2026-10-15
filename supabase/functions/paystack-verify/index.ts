import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { fulfilRayProp } from "../_shared/rayprop-fulfil.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (s: number, b: unknown) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });

    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authErr } = await userClient.auth.getClaims(token);
    if (authErr || !claims?.claims) return json(401, { error: "Unauthorized" });
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const reference = String(body.reference || "").trim();
    if (!reference) return json(400, { error: "Missing reference" });

    const key = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!key) return json(500, { error: "Paystack is not configured" });

    const r = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const j = await r.json();
    if (!r.ok || !j.status) return json(400, { error: j.message || "Could not verify payment" });

    const tx = j.data;
    if (tx.status !== "success") {
      return json(400, { error: `Payment ${tx.status}`, status: tx.status });
    }

    const meta = tx.metadata || {};
    if (meta.user_id && meta.user_id !== userId) {
      return json(403, { error: "Reference does not belong to this user" });
    }

    // Use service role to insert the booking and bypass any future schema constraints
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Idempotency: if a booking already exists with this reference, just return it
    const { data: existing } = await admin
      .from("bookings")
      .select("*")
      .eq("payment_reference", reference)
      .maybeSingle();
    if (existing) return json(200, { booking: existing, already: true });

    if (meta.source === "rayprop") {
      if (Number(tx.amount) !== Number(meta.amount_kobo)) return json(400, { error: "Payment amount mismatch" });
      const result = await fulfilRayProp({
        reference, hold_id: meta.hold_id, quote_id: meta.quote_id, listing_id: meta.rayprop_listing_id,
        check_in: meta.check_in, check_out: meta.check_out, guests: Number(meta.guests || 1),
        guest: { name: meta.guest_name, email: meta.guest_email, phone: meta.guest_phone },
      });
      const { data: booking, error: rerr } = await admin.from("bookings").insert({
        guest_id: userId, listing_id: null, source: "rayprop",
        check_in_date: meta.check_in, check_out_date: meta.check_out,
        total_price: Number(meta.amount_kobo) / 100, payment_reference: reference,
        rayprop_listing_id: meta.rayprop_listing_id, rayprop_quote_id: meta.quote_id, rayprop_hold_id: meta.hold_id,
        rayprop_quote_total_kobo: Number(meta.amount_kobo), rayprop_hold_expires_at: meta.hold_expires_at,
        guest_count: Number(meta.guests || 1), partner_title: meta.title, partner_image: meta.image || null, partner_city: meta.city || null,
        ...result,
      }).select("*").single();
      if (rerr) return json(500, { error: rerr.message });
      return json(200, { booking, already: false });
    }

    const { data: booking, error: berr } = await admin
      .from("bookings")
      .insert({
        guest_id: userId,
        listing_id: meta.listing_id,
        check_in_date: meta.check_in,
        check_out_date: meta.check_out,
        total_price: meta.total,
        status: "confirmed",
        payment_reference: reference,
      })
      .select("*")
      .single();
    if (berr) return json(500, { error: berr.message });

    return json(200, { booking, already: false });
  } catch (e) {
    return json(500, { error: (e as Error).message });
  }
});
