import { getSetting } from "../_shared/settings.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  RayPropError, markupPerNightKobo, raypropAvailability, raypropCancel, raypropHold, raypropQuote,
  raypropRegisterWebhook, raypropReservationStatus, raypropList, raypropWalletBalance, unwrapRayProp,
} from "../_shared/rayprop.ts";
import { mapRayPropStatus, raypropMatches, catalogueRefreshDue } from "../_shared/rayprop-core.ts";
import { fulfilRayProp } from "../_shared/rayprop-fulfil.ts";
import { notifyPartnerBooking } from "../_shared/partner-fulfil-booking.ts";
import { raypropFetch as rpFetch } from "../_shared/rayprop.ts";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TTL = 30 * 60_000;

/** Whole RayProp catalogue: memory (10 min) → saved DB copy → paced RayProp refresh at most every 6 hours. */
let catalogue: { at: number; rows: any[] } | null = null;
let inflight: Promise<any[]> | null = null;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const readSavedCatalogue = async (): Promise<any[]> => {
  const db = admin();
  const { count } = await db.from("partner_catalogue").select("rayprop_listing_id", { count: "exact", head: true });
  const n = Math.max(1, Math.ceil((count || 0) / 500));
  const parts = await Promise.all(Array.from({ length: n }, (_, i) =>
    db.from("partner_catalogue").select("record").order("rayprop_listing_id").range(i * 500, i * 500 + 499)));
  const rows: any[] = [];
  for (const { data, error } of parts) {
    if (error) { console.error("[rayprop-api] saved catalogue read failed", error); continue; }
    rows.push(...(data || []).map((d: any) => d.record));
  }
  return rows;
};

const refreshFromRayProp = async (): Promise<any[]> => {
  const first = await raypropList({ limit: "50" });
  const pages = Math.min(Number(first?.meta?.total_pages || 1), 100);
  const rows: any[] = [...((unwrapRayProp(first) as any[]) || [])];
  for (let p = 2; p <= pages; p++) {
    await sleep(300);
    try { rows.push(...((unwrapRayProp(await raypropList({ limit: "50", page: String(p) })) as any[]) || [])); }
    catch (e) { console.error(`[rayprop-api] page ${p} failed; stopping refresh`, e); break; }
  }
  const seen = new Set<string>();
  const unique = rows.filter((r) => r?.id && !seen.has(String(r.id)) && !!seen.add(String(r.id)));
  if (unique.length) {
    const db = admin();
    const now = new Date().toISOString();
    for (let i = 0; i < unique.length; i += 500) {
      await db.from("partner_catalogue").upsert(unique.slice(i, i + 500).map((r) => ({ rayprop_listing_id: String(r.id), record: r, refreshed_at: now })));
    }
    if (rows.length >= 50 * pages) await db.from("partner_catalogue").delete().lt("refreshed_at", now);
    await db.from("partner_sync_state").upsert({ id: 1, last_full_refresh_at: now, updated_at: now });
  }
  return unique;
};

const loadCatalogue = async (): Promise<any[]> => {
  if (catalogue && Date.now() - catalogue.at < TTL) return catalogue.rows;
  if (inflight) return inflight;
  inflight = (async () => {
    const { data: state } = await admin().from("partner_sync_state").select("last_full_refresh_at, blocked_until").eq("id", 1).maybeSingle();
    let rows = await readSavedCatalogue();
    const due = catalogueRefreshDue(state?.last_full_refresh_at, state?.blocked_until);
    const refresh = async () => {
      try {
        const fresh = await refreshFromRayProp();
        if (fresh.length) {
          rows = fresh;
          const sync = syncPartnerLocations(fresh).catch((e) => console.error("[rayprop-api] location sync failed", e));
          (globalThis as any).EdgeRuntime?.waitUntil?.(sync);
        }
      } catch (e) {
        console.error("[rayprop-api] catalogue refresh failed; using saved copy", e);
      }
      return rows;
    };
    if (due && rows.length) {
      // Serve the saved copy now; refresh in the background so no searcher waits.
      const bg = refresh().then((r) => { catalogue = { at: Date.now(), rows: r }; });
      (globalThis as any).EdgeRuntime?.waitUntil?.(bg);
    } else if (due) {
      rows = await refresh();
    }
    catalogue = { at: Date.now(), rows };
    return rows;
  })().finally(() => { inflight = null; });
  return inflight;
};

/** Run every partner stay we haven't seen before through the place matcher (unmatched ones land in admin review). */
const partnerLocationRow = (r: any) => ({
  id: String(r.id), title: r.title ?? null, state: r.state ?? null, city: r.city ?? null,
  neighborhood: r.neighborhood ?? null, address: r.address ?? null,
  lat: r.latitude ?? r.lat ?? null, lng: r.longitude ?? r.lng ?? null,
});
async function syncPartnerLocations(rows: any[], force = false) {
  const db = admin();
  let todo = rows;
  if (!force) {
    const seen = new Set<string>();
    for (let from = 0; ; from += 1000) {
      const { data } = await db.from("partner_location_map").select("rayprop_listing_id").range(from, from + 999);
      (data || []).forEach((d: any) => seen.add(d.rayprop_listing_id));
      if (!data || data.length < 1000) break;
    }
    todo = rows.filter((r) => !seen.has(String(r.id)));
  }
  for (let i = 0; i < todo.length; i += 200) {
    const { error } = await db.rpc("tag_partner_locations", { _rows: todo.slice(i, i + 200).map(partnerLocationRow), _force: force });
    if (error) throw error;
  }
  if (todo.length) await db.rpc("refresh_location_counts");
  return todo.length;
}

/** partner listing id → its place ids, cached alongside the catalogue. */
let placeMap: { at: number; rows: Map<string, string[]> } | null = null;
const loadPlaceMap = async () => {
  if (placeMap && Date.now() - placeMap.at < TTL) return placeMap.rows;
  const rows = new Map<string, string[]>();
  for (let from = 0; ; from += 1000) {
    const { data } = await admin().from("partner_location_map")
      .select("rayprop_listing_id,state_id,city_id,neighbourhood_id").in("status", ["ok", "confirmed"]).range(from, from + 999);
    (data || []).forEach((d: any) => rows.set(d.rayprop_listing_id, [d.state_id, d.city_id, d.neighbourhood_id].filter(Boolean)));
    if (!data || data.length < 1000) break;
  }
  placeMap = { at: Date.now(), rows };
  return rows;
};

const admin = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const requireUser = async (req: Request) => {
  const header = req.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) throw new RayPropError("Unauthorized", 401);
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: header } },
  });
  const { data, error } = await client.auth.getClaims(header.slice(7));
  if (error || !data?.claims?.sub) throw new RayPropError("Unauthorized", 401);
  return data.claims.sub as string;
};

const requireAdmin = async (userId: string) => {
  const { data } = await admin().from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new RayPropError("Admins only", 403);
};

const text = (value: unknown, max = 255) => {
  const r = String(value ?? "").trim();
  return r.length > 0 && r.length <= max ? r : null;
};
const stripRp = (id: string) => id.replace(/^rp_/, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const body = await req.json().catch(() => null);
    const action = text(body?.action, 32);
    if (!action) return json(400, { error: "Missing action" });
    const configured = !!Deno.env.get("RAYPROP_API_KEY");

    if (action === "search" || action === "places") {
      if (!configured) return json(200, { data: [], disabled: true });
      const all = await loadCatalogue();
      if (action === "places") {
        const tally = new Map<string, { city: string; state: string; area: string; count: number }>();
        for (const r of all) {
          const k = `${r.city}|${r.state}|${r.neighborhood}`;
          const t = tally.get(k) || { city: String(r.city || ""), state: String(r.state || ""), area: String(r.neighborhood || ""), count: 0 };
          t.count++; tally.set(k, t);
        }
        return json(200, { data: [...tally.values()], meta: { total: all.length } });
      }
      const limit = Number(body?.limit || 30);
      const page = Number(body?.page || 1);
      if (!Number.isInteger(limit) || limit < 1 || limit > 60) return json(400, { error: "Invalid limit" });
      if (!Number.isInteger(page) || page < 1 || page > 500) return json(400, { error: "Invalid page" });
      const q = body?.q ? text(body.q, 80) : null;
      const listingId = body?.listing_id ? text(stripRp(String(body.listing_id)), 120) : null;
      if (listingId) {
        let hit = all.filter((r) => String(r.id) === listingId);
        if (!hit.length) {
          try { hit = (unwrapRayProp(await raypropList({ listing_id: listingId, limit: "1" })) as any[]) || []; }
          catch (e) { return json(200, { data: [], meta: { total: 0, hasMore: false }, unavailable: true }); }
        }
        return json(200, { data: hit, meta: { total: hit.length, hasMore: false } });
      }
      const locationId = body?.location_id ? text(body.location_id, 64) : null;
      let rows: any[];
      if (locationId) {
        // Place picked from the list: State/City/Neighbourhood match, top-down (Lekki includes Chevron).
        const map = await loadPlaceMap();
        rows = all.filter((r) => map.get(String(r.id))?.includes(locationId));
      } else rows = q ? all.filter((r) => raypropMatches(r, q)) : all;
      // Cards need only a few photos; the stay page fetches the full record.
      const slice = rows.slice((page - 1) * limit, page * limit).map((r) =>
        Array.isArray(r?.listing_images) && r.listing_images.length > 6 ? { ...r, listing_images: [...r.listing_images].sort((a: any, b: any) => Number(!!b?.is_primary) - Number(!!a?.is_primary)).slice(0, 6) } : r);
      return json(200, { data: slice, meta: { total: rows.length, page, hasMore: page * limit < rows.length } });
    }

    if (action === "availability") {
      if (!configured) return json(200, { data: null, disabled: true });
      const listing_id = text(body?.listing_id, 120);
      const start = text(body?.start_date, 10);
      const end = text(body?.end_date, 10);
      if (!listing_id || !DATE.test(start || "") || !DATE.test(end || "")) return json(400, { error: "Invalid availability request" });
      // RayProp rejects long ranges (VAL_001 "Date range too large"): fetch in 30-day chunks and merge.
      const DAY = 86400000;
      const s = Date.parse(start! + "T00:00:00Z");
      const e = Math.min(Date.parse(end! + "T00:00:00Z"), s + 180 * DAY);
      if (!(e > s)) return json(400, { error: "Invalid availability request" });
      const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
      const parts: unknown[] = [];
      try {
        for (let c = s; c < e; c += 30 * DAY) {
          parts.push(unwrapRayProp(await raypropAvailability(stripRp(listing_id), iso(c), iso(Math.min(c + 30 * DAY, e)))));
        }
      } catch (err) {
        console.error("[rayprop-api] availability failed", err);
        return json(200, { data: null, unavailable: true });
      }
      if (parts.length === 1) return json(200, { data: parts[0] });
      const listOf = (p: any): any[] | null => Array.isArray(p) ? p
        : p && typeof p === "object" ? (Object.values(p).find(Array.isArray) as any[] | undefined) ?? null : null;
      const key = (p: any) => p && typeof p === "object" && !Array.isArray(p) ? Object.keys(p).find((k) => Array.isArray(p[k])) : undefined;
      const seen = new Set<string>();
      const merged = parts.flatMap((p) => listOf(p) ?? []).filter((d: any) => {
        const k = String(d?.date ?? JSON.stringify(d));
        if (seen.has(k)) return false; seen.add(k); return true;
      });
      const first: any = parts[0];
      const k = key(first);
      return json(200, { data: k ? { ...first, [k]: merged } : merged });
    }

    if (action === "reviews") {
      const listing_id = stripRp(text(body?.listing_id, 120) || "");
      if (!listing_id) return json(400, { error: "listing_id required" });
      try {
        const r = await rpFetch({ path: `/reviews?${new URLSearchParams({ listing_id, limit: "20" })}` });
        return json(200, { data: unwrapRayProp(r) });
      } catch {
        return json(200, { data: [] }); // RayProp reviews unavailable — show none
      }
    }

    const userId = await requireUser(req);

    if (action === "quote") {
      const listing_id = text(body?.listing_id, 120);
      const check_in = text(body?.check_in, 10);
      const check_out = text(body?.check_out, 10);
      const guests = Number(body?.guests);
      if (!listing_id || !DATE.test(check_in || "") || !DATE.test(check_out || "") || !Number.isInteger(guests) || guests < 1 || guests > 20) {
        return json(400, { error: "Invalid quote details" });
      }
      const saved = await getSetting<number>("markup_per_night_kobo", -1);
      const markup = saved >= 0 ? Math.round(saved) : markupPerNightKobo();
      return json(200, { data: unwrapRayProp(await raypropQuote({
        listing_id: stripRp(listing_id), check_in_date: check_in!, check_out_date: check_out!, guest_count: guests,
        ...(markup ? { developer_markup_per_night: markup } : {}),
      })) });
    }

    if (action === "hold") {
      const quote_id = text(body?.quote_id, 120);
      const guest_name = text(body?.guest_name, 120);
      const guest_phone = text(body?.guest_phone, 20);
      const guest_email = text(body?.guest_email, 254);
      if (!quote_id || !guest_name || !guest_phone || !/^\+\d{8,15}$/.test(guest_phone) || !guest_email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(guest_email)) {
        return json(400, { error: "Please enter your full name, a valid email and phone in +234… format" });
      }
      return json(200, { data: unwrapRayProp(await raypropHold({ quote_id, guest_name, guest_phone, guest_email })) });
    }

    if (action === "cancel") {
      const booking_id = text(body?.booking_id, 64);
      if (!booking_id) return json(400, { error: "Missing booking" });
      const db = admin();
      const { data: b } = await db.from("bookings").select("id,guest_id,source,rayprop_reservation_id,status").eq("id", booking_id).maybeSingle();
      if (!b || b.guest_id !== userId || b.source !== "rayprop" || !b.rayprop_reservation_id) return json(404, { error: "Booking not found" });
      if (b.status === "cancelled") return json(200, { data: { status: "cancelled" } });
      const result = unwrapRayProp(await raypropCancel(b.rayprop_reservation_id, String(body?.reason || "Guest requested cancellation").slice(0, 500)));
      await db.from("bookings").update({ status: "cancelled" }).eq("id", b.id);
      return json(200, { data: result });
    }

    if (action === "status") {
      const booking_id = text(body?.booking_id, 64);
      if (!booking_id) return json(400, { error: "Missing booking" });
      const db = admin();
      const { data: b } = await db.from("bookings").select("id,guest_id,rayprop_reservation_id").eq("id", booking_id).maybeSingle();
      if (!b?.rayprop_reservation_id) return json(404, { error: "Booking not found" });
      if (b.guest_id !== userId) await requireAdmin(userId);
      const r = unwrapRayProp(await raypropReservationStatus(b.rayprop_reservation_id));
      const mapped = mapRayPropStatus(String(r?.status || ""));
      if (mapped) await db.from("bookings").update({ status: mapped }).eq("id", b.id);
      return json(200, { data: r });
    }

    if (action === "retag_locations") {
      await requireAdmin(userId);
      if (!configured) return json(200, { data: { tagged: 0 }, disabled: true });
      const tagged = await syncPartnerLocations(await loadCatalogue(), true);
      return json(200, { data: { tagged } });
    }

    if (action === "retry") {
      await requireAdmin(userId);
      const booking_id = text(body?.booking_id, 64);
      const db = admin();
      const { data: b } = await db.from("bookings").select("*").eq("id", booking_id).maybeSingle();
      if (!b || b.source !== "rayprop") return json(404, { error: "Booking not found" });
      const { data: prof } = await db.from("profiles").select("full_name,email,phone").eq("user_id", b.guest_id).maybeSingle();
      const result = await fulfilRayProp({
        reference: b.payment_reference || b.id, hold_id: b.rayprop_hold_id || "", quote_id: b.rayprop_quote_id || "",
        listing_id: b.rayprop_listing_id || "", check_in: b.check_in_date, check_out: b.check_out_date, guests: b.guest_count || 1,
        guest: { name: prof?.full_name || "Guest", email: prof?.email || "", phone: prof?.phone || "" },
        existingReservationId: b.rayprop_reservation_id,
      });
      const { data: nb } = await db.from("bookings").update(result).eq("id", b.id).select("*").single();
      if (nb && result.status === "confirmed" && b.status !== "confirmed") await notifyPartnerBooking(db, nb, b.guest_id).catch(() => {});
      return json(200, { data: result });
    }

    if (action === "sync_state") {
      await requireAdmin(userId);
      const { data } = await admin().from("partner_sync_state").select("*").eq("id", 1).maybeSingle();
      const { count } = await admin().from("partner_catalogue").select("rayprop_listing_id", { count: "exact", head: true });
      return json(200, { data: { ...(data || {}), saved: count || 0 } });
    }

    if (action === "wallet") {
      await requireAdmin(userId);
      if (!configured) return json(200, { data: null, disabled: true });
      return json(200, { data: unwrapRayProp(await raypropWalletBalance()) });
    }

    if (action === "register_webhook") {
      await requireAdmin(userId);
      const secret = Deno.env.get("RAYPROP_WEBHOOK_SECRET")?.trim();
      if (!secret) return json(400, { error: "Add the RayProp webhook secret first" });
      const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/rayprop-webhook`;
      return json(200, { data: unwrapRayProp(await raypropRegisterWebhook(url, secret)), url });
    }

    return json(400, { error: "Unsupported action" });
  } catch (error) {
    console.error("[rayprop-api] error", error);
    if (error instanceof RayPropError) return json(error.status, { error: error.message, code: error.code });
    return json(502, { error: "Partner stays are temporarily unavailable" });
  }
});
