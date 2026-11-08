import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { fulfilPartnerBooking } from "../_shared/partner-fulfil-booking.ts";

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

    if (meta.source === "rayprop") {
      try {
        const booking = await fulfilPartnerBooking(admin, tx);
        return json(200, { booking, already: false });
      } catch (e) {
        return json(400, { error: (e as Error).message });
      }
    }

    // The held booking was created at payment start; confirm it (idempotent, amount-checked, overlap-safe).
    const { data: booking, error: berr } = await admin.rpc("confirm_local_payment", {
      _reference: reference, _amount_kobo: Number(tx.amount),
    });
    if (berr) return json(500, { error: berr.message });
    return json(200, { booking, already: false });
  } catch (e) {
    return json(500, { error: (e as Error).message });
  }
});
