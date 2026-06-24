// Initiates a Paystack Transfer for a single payout row.
// Requires the caller to be an authenticated admin.
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const PAYSTACK = "https://api.paystack.co";
const PAYSTACK_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

    // Validate caller as admin using their JWT
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    const { data: roleRow } = await userClient
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return json({ error: "forbidden" }, 403);

    const { payout_id } = await req.json().catch(() => ({}));
    if (!payout_id || typeof payout_id !== "string") return json({ error: "payout_id required" }, 400);

    // Service-role client for writes
    const svc = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: payout, error: pErr } = await svc
      .from("payouts").select("*").eq("id", payout_id).maybeSingle();
    if (pErr || !payout) return json({ error: "payout_not_found" }, 404);
    if (payout.status !== "pending") return json({ error: `payout_not_pending (${payout.status})` }, 409);

    // Resolve bank account: use payout.payment_method_id, else host's default
    let pmId = payout.payment_method_id as string | null;
    if (!pmId) {
      const { data: pm } = await svc
        .from("payment_methods").select("id").eq("user_id", payout.host_id).eq("is_default", true).maybeSingle();
      pmId = pm?.id ?? null;
    }
    if (!pmId) return json({ error: "no_payout_account" }, 422);

    const { data: pm } = await svc.from("payment_methods").select("*").eq("id", pmId).maybeSingle();
    if (!pm?.bank_code || !pm?.last4) return json({ error: "incomplete_payout_account" }, 422);

    // We need full account number. Convention: stored in `metadata.account_number` if present,
    // otherwise reject (we never store full PAN; admins must re-enter).
    const accountNumber = (pm as any).account_number ?? (pm as any).metadata?.account_number ?? null;
    if (!accountNumber) return json({ error: "account_number_missing" }, 422);

    // 1) Create transfer recipient
    const recipRes = await fetch(`${PAYSTACK}/transferrecipient`, {
      method: "POST",
      headers: { Authorization: `Bearer ${PAYSTACK_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "nuban",
        name: pm.holder_name,
        account_number: accountNumber,
        bank_code: pm.bank_code,
        currency: payout.currency || "NGN",
      }),
    });
    const recipJson = await recipRes.json();
    if (!recipRes.ok || !recipJson?.data?.recipient_code) {
      return json({ error: "recipient_failed", details: recipJson }, 502);
    }

    // 2) Initiate transfer
    const tRes = await fetch(`${PAYSTACK}/transfer`, {
      method: "POST",
      headers: { Authorization: `Bearer ${PAYSTACK_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "balance",
        reason: `Stay payout ${payout.id}`,
        amount: Math.round(Number(payout.amount) * 100), // kobo
        recipient: recipJson.data.recipient_code,
        reference: `payout_${payout.id}`,
      }),
    });
    const tJson = await tRes.json();
    if (!tRes.ok) {
      await svc.from("payouts").update({
        status: "failed",
        failure_reason: tJson?.message || "paystack_error",
      }).eq("id", payout.id);
      return json({ error: "transfer_failed", details: tJson }, 502);
    }

    await svc.from("payouts").update({
      status: "processing",
      paystack_transfer_code: tJson.data?.transfer_code ?? null,
      processed_by: user.id,
    }).eq("id", payout.id);

    await svc.from("admin_audit_log").insert({
      actor_id: user.id,
      action: "payout_processing",
      entity_type: "payout",
      entity_id: payout.id,
      metadata: { transfer_code: tJson.data?.transfer_code, amount: payout.amount },
    });

    return json({ ok: true, transfer: tJson.data });
  } catch (e) {
    return json({ error: "internal_error", message: (e as Error).message }, 500);
  }
});
