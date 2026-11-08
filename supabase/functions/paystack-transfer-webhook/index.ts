// Paystack Transfer webhook -> marks payouts paid/failed.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createHmac } from "node:crypto";
import { fulfilPartnerBooking } from "../_shared/partner-fulfil-booking.ts";

const PAYSTACK_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature") || "";
  const expected = createHmac("sha512", PAYSTACK_KEY).update(raw).digest("hex");
  if (signature !== expected) return json({ error: "invalid_signature" }, 401);

  let event: any;
  try { event = JSON.parse(raw); } catch { return json({ error: "bad_json" }, 400); }

  const svc = createClient(SUPABASE_URL, SERVICE_KEY);

  // Guest payments: save the booking even if the guest closed the page before confirmation.
  if (event.event === "charge.success") {
    const tx = event.data || {};
    if (tx.metadata?.source !== "rayprop") {
      const { error } = await svc.rpc("confirm_local_payment", { _reference: String(tx.reference), _amount_kobo: Number(tx.amount) });
      if (error) {
        console.error("[paystack-webhook] local confirm failed", tx.reference, error.message);
        return json({ error: "confirm_failed" }, error.code === "P0002" ? 200 : 500);
      }
      return json({ ok: true });
    }
    try {
      await fulfilPartnerBooking(svc, tx);
      return json({ ok: true });
    } catch (e) {
      console.error("[paystack-webhook] partner fulfil failed", tx.reference, (e as Error).message);
      return json({ error: "fulfil_failed" }, 500); // Paystack will retry
    }
  }

  const transferCode: string | undefined = event?.data?.transfer_code;
  if (!transferCode) return json({ ok: true, ignored: true });

  let status: string | null = null;
  let failureReason: string | null = null;
  switch (event.event) {
    case "transfer.success": status = "paid"; break;
    case "transfer.failed":  status = "failed"; failureReason = event?.data?.reason || "paystack_failed"; break;
    case "transfer.reversed": status = "failed"; failureReason = "reversed"; break;
    default: return json({ ok: true, ignored: event.event });
  }

  const patch: Record<string, unknown> = { status };
  if (status === "paid") patch.processed_at = new Date().toISOString();
  if (failureReason) patch.failure_reason = failureReason;

  await svc.from("payouts").update(patch).eq("paystack_transfer_code", transferCode);
  return json({ ok: true });
});
