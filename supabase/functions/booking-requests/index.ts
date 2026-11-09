import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Request-to-book: host accepts/declines a paid request, and declined (or timed-out) requests get a full refund.
// POST { booking_id, action: "accept"|"decline", reason? }  (host or admin, signed in)
// POST { sweep: true }  (hourly job) — refunds every declined, paid local booking not yet refunded.
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const svc = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function refundDeclined(admin: ReturnType<typeof svc>, onlyId?: string) {
  let q = admin.from("bookings").select("id, total_price, payment_reference, guest_id")
    .eq("status", "declined").neq("source", "rayprop").not("paid_at", "is", null).limit(50);
  if (onlyId) q = q.eq("id", onlyId);
  const { data: rows } = await q;
  let done = 0;
  for (const b of rows ?? []) {
    // Lock: only one run refunds a booking.
    const { data: won } = await admin.from("bookings").update({ status: "refunded" })
      .eq("id", b.id).eq("status", "declined").select("id").maybeSingle();
    if (!won) continue;
    const amount = Number(b.total_price);
    const { data: refund } = await admin.from("refunds").insert({
      booking_id: b.id, amount, reason: "Request not accepted by host", initiated_by: b.guest_id, status: "pending",
    }).select("id").single();
    const r = await fetch("https://api.paystack.co/refund", {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({ transaction: b.payment_reference, amount: Math.round(amount * 100) }),
    }).catch(() => null);
    const pj = r ? await r.json().catch(() => ({})) : {};
    if (r?.ok && pj.status) {
      await admin.from("refunds").update({ status: "processing", paystack_reference: String(pj.data?.id ?? "") }).eq("id", refund!.id);
      done++;
    } else {
      await admin.from("refunds").update({ status: "failed", failure_reason: String(pj.message ?? "Paystack refund failed").slice(0, 300) }).eq("id", refund!.id);
      await admin.rpc("notify_admins", { _title: "Refund failed", _body: "A declined booking request could not be refunded automatically. Refund it by hand.", _link: "/admin/bookings" });
    }
  }
  return done;
}

// Split bookings whose hold ran out (or were cancelled) before everyone paid: refund each paid share in full.
async function refundOrphanShares(admin: ReturnType<typeof svc>) {
  const { data: rows } = await admin.from("payment_shares")
    .select("id, reference, amount_kobo, booking_id, pay_method, bookings!inner(status)")
    .eq("status", "paid").in("bookings.status", ["expired", "cancelled"]).limit(50);
  let done = 0;
  for (const s of (rows ?? []) as any[]) {
    const { data: won } = await admin.from("payment_shares").update({ status: "refunded", refunded_at: new Date().toISOString() })
      .eq("id", s.id).eq("status", "paid").select("id");
    if (!won?.length) continue;
    if (s.pay_method === "bank_transfer") {
      await admin.from("payment_shares").update({ status: "refund_failed" }).eq("id", s.id);
      await admin.rpc("notify_admins", { _title: "Send a split share refund", _body: "A share paid by bank transfer on an unfinished split booking must be refunded to the payer's bank account by hand.", _link: "/admin/bookings" });
      continue;
    }
    const r = await fetch("https://api.paystack.co/refund", {
      method: "POST", headers: { Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({ transaction: s.reference, amount: Number(s.amount_kobo) }),
    }).catch(() => null);
    const pj = r ? await r.json().catch(() => ({})) : {};
    if (r?.ok && (pj as any).status) { done++; await admin.rpc("log_booking_event", { _booking_id: s.booking_id, _type: "share_refunded", _actor: "system", _data: { share_id: s.id } }); }
    else {
      await admin.from("payment_shares").update({ status: "refund_failed" }).eq("id", s.id);
      await admin.rpc("notify_admins", { _title: "Split share refund failed", _body: "A paid share on an unfinished split booking could not be refunded automatically.", _link: "/admin/bookings" });
    }
  }
  return done;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const admin = svc();
    if (body.sweep === true) {
      const { data: reminded } = await admin.rpc("split_reminders_tick");
      return json({ refunded: await refundDeclined(admin), shares_refunded: await refundOrphanShares(admin), split_reminders: reminded ?? 0 });
    }

    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Please sign in again" }, 401);
    const id = typeof body.booking_id === "string" ? body.booking_id : "";
    const action = body.action;
    if (!/^[0-9a-f-]{36}$/i.test(id) || !["accept", "decline"].includes(action)) return json({ error: "Invalid request" }, 400);
    const user = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { error } = await user.rpc("host_booking_action", {
      _booking_id: id, _action: action, _reason: typeof body.reason === "string" ? body.reason.slice(0, 300) : null,
    });
    if (error) return json({ error: error.message }, 400);
    if (action === "decline") await refundDeclined(admin, id);
    return json({ ok: true });
  } catch (e) {
    console.error("[booking-requests]", e);
    return json({ error: "Something went wrong" }, 500);
  }
});
