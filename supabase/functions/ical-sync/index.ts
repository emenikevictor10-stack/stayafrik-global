import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { parseIcalBusy } from "../_shared/ical-core.ts";

// Imports busy dates from each listing's external calendar link (Airbnb, Booking.com…) as `ical` blocks.
// POST {} (hourly job) syncs all; POST { listing_id } (host) syncs one listing they own.
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const body = await req.json().catch(() => ({}));
  let q = admin.from("listings").select("id, host_id, ical_url").not("ical_url", "is", null).limit(200);
  if (typeof body.listing_id === "string") {
    const auth = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: u } = await admin.auth.getUser(auth);
    if (!u?.user) return json({ error: "Please sign in again" }, 401);
    q = q.eq("id", body.listing_id).eq("host_id", u.user.id);
  }
  const { data: rows } = await q;
  const today = new Date().toISOString().slice(0, 10);
  let synced = 0;
  for (const l of rows ?? []) {
    try {
      const url = String(l.ical_url);
      if (!/^https:\/\//i.test(url)) throw new Error("Link must start with https://");
      const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!r.ok) throw new Error(`Calendar link answered ${r.status}`);
      const ranges = parseIcalBusy(await r.text(), today).slice(0, 500);
      await admin.from("listing_blocks").delete().eq("listing_id", l.id).eq("source", "ical");
      if (ranges.length) await admin.from("listing_blocks").insert(ranges.map((x) => ({ listing_id: l.id, ...x, source: "ical", note: "Imported calendar" })));
      await admin.from("listings").update({ ical_synced_at: new Date().toISOString(), ical_error: null }).eq("id", l.id);
      synced++;
    } catch (e) {
      await admin.from("listings").update({ ical_error: String((e as Error).message).slice(0, 200) }).eq("id", l.id);
    }
  }
  return json({ synced });
});
