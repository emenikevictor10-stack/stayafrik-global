// Scheduled backstop: checks stuck partner bookings with RayProp (missed webhooks) and the RayProp wallet balance.
import { createClient } from "npm:@supabase/supabase-js@2";
import { raypropReservationStatus, raypropWalletBalance, raypropPausedUntil, unwrapRayProp } from "../_shared/rayprop.ts";
import { reconcileTarget, walletLow } from "../_shared/rayprop-core.ts";
import { getSetting } from "../_shared/settings.ts";
import { authenticateCronRequest } from "../_shared/cron-auth.ts";

const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  const denied = authenticateCronRequest(req);
  if (denied) return denied;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(Deno.env.get("SUPABASE_URL")!, key);
  const summary: Record<string, unknown> = { checked: 0, moved: 0, wallet: "unknown" };
  try {
    if (await raypropPausedUntil()) {
      summary.paused = true;
    } else {
      const since = new Date(Date.now() - 3 * 86400_000).toISOString();
      const { data: rows } = await db.from("bookings").select("id,status,rayprop_reservation_id")
        .eq("source", "rayprop").in("status", ["processing", "needs_attention"]).not("rayprop_reservation_id", "is", null).gte("created_at", since).limit(25);
      for (const b of rows ?? []) {
        summary.checked = (summary.checked as number) + 1;
        try {
          const r: any = unwrapRayProp(await raypropReservationStatus(b.rayprop_reservation_id!));
          const target = reconcileTarget(b.status, String(r?.status ?? ""));
          if (target) {
            await db.from("bookings").update(target === "needs_attention" ? { status: target, attention_reason: "RayProp reports the reservation failed" } : { status: target }).eq("id", b.id);
            summary.moved = (summary.moved as number) + 1;
          }
        } catch (e) { console.error("[reconcile] status", b.id, (e as Error).message); }
      }
      // Wallet check (alert admins at most every 6 hours)
      try {
        const threshold = Number(await getSetting<number>("wallet_alert_threshold_kobo", 100000000));
        const low = walletLow(await raypropWalletBalance(), threshold);
        summary.wallet = low === null ? "unknown" : low ? "low" : "ok";
        if (low) {
          const { data: last } = await db.from("cron_runs").select("id").eq("job", "rayprop_reconcile").contains("summary", { wallet_alerted: true })
            .gte("started_at", new Date(Date.now() - 6 * 3600_000).toISOString()).limit(1);
          if (!last?.length) {
            await db.rpc("notify_admins", { _title: "RayProp wallet is low", _body: "Top up the RayProp wallet so partner bookings can be confirmed.", _link: "/admin/health" });
            summary.wallet_alerted = true;
          }
        }
      } catch (e) { summary.wallet_error = (e as Error).message.slice(0, 200); }
    }
    await db.from("cron_runs").insert({ job: "rayprop_reconcile", ok: true, summary });
    return json(200, summary);
  } catch (e) {
    await db.from("cron_runs").insert({ job: "rayprop_reconcile", ok: false, summary: { error: (e as Error).message } });
    return json(500, { error: "reconcile failed" });
  }
});
