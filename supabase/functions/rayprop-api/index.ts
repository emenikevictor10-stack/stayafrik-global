import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  RayPropError, markupPerNightKobo, raypropAvailability, raypropCancel, raypropHold, raypropQuote,
  raypropRegisterWebhook, raypropReservationStatus, raypropList, raypropWalletBalance, unwrapRayProp,
} from "../_shared/rayprop.ts";
import { mapRayPropStatus, raypropMatches } from "../_shared/rayprop-core.ts";
import { fulfilRayProp } from "../_shared/rayprop-fulfil.ts";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const cache = new Map<string, { at: number; data: unknown }>();
const TTL = 10 * 60_000;

/** Whole RayProp catalogue (all pages, all cities), cached 10 minutes. */
let catalogue: { at: number; rows: any[] } | null = null;
let inflight: Promise<any[]> | null = null;
const loadCatalogue = async (): Promise<any[]> => {
  if (catalogue && Date.now() - catalogue.at < TTL) return catalogue.rows;
  if (inflight) return inflight;
  inflight = (async () => {
    const first = await raypropList({ limit: "50" });
    const pages = Math.min(Number(first?.meta?.total_pages || 1), 100);
    const rows: any[] = [...((unwrapRayProp(first) as any[]) || [])];
    for (let p = 2; p <= pages; p += 6) {
      const batch = await Promise.allSettled(
        Array.from({ length: Math.min(6, pages - p + 1) }, (_, i) => raypropList({ limit: "50", page: String(p + i) })),
      );
      for (const r of batch) if (r.status === "fulfilled") rows.push(...((unwrapRayProp(r.value) as any[]) || []));
    }
    const seen = new Set<string>();
    const unique = rows.filter((r) => r?.id && !seen.has(String(r.id)) && !!seen.add(String(r.id)));
    catalogue = { at: Date.now(), rows: unique };
    return unique;
  })().finally(() => { inflight = null; });
  return inflight;
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
        if (!hit.length) hit = (unwrapRayProp(await raypropList({ listing_id: listingId, limit: "1" })) as any[]) || [];
        return json(200, { data: hit, meta: { total: hit.length, hasMore: false } });
      }
      const rows = q ? all.filter((r) => raypropMatches(r, q)) : all;
      const slice = rows.slice((page - 1) * limit, page * limit);
      return json(200, { data: slice, meta: { total: rows.length, page, hasMore: page * limit < rows.length } });
    }

    if (action === "availability") {
      if (!configured) return json(200, { data: null, disabled: true });
      const listing_id = text(body?.listing_id, 120);
      const start = text(body?.start_date, 10);
      const end = text(body?.end_date, 10);
      if (!listing_id || !DATE.test(start || "") || !DATE.test(end || "")) return json(400, { error: "Invalid availability request" });
      return json(200, { data: unwrapRayProp(await raypropAvailability(stripRp(listing_id), start!, end!)) });
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
      const markup = markupPerNightKobo();
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
      await db.from("bookings").update(result).eq("id", b.id);
      return json(200, { data: result });
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
