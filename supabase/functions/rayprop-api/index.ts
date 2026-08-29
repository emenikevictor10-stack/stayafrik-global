import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  raypropHold,
  raypropQuote,
  raypropReservation,
  raypropReservationStatus,
  raypropSearch,
  unwrapRayProp,
} from "../_shared/rayprop.ts";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const CITIES = new Set(["Lagos", "Abuja", "Port Harcourt", "Enugu", "Ibadan"]);

const requireUser = async (req: Request) => {
  const header = req.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) throw new Error("Unauthorized");
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: header } },
  });
  const { data, error } = await client.auth.getClaims(header.slice(7));
  if (error || !data?.claims?.sub) throw new Error("Unauthorized");
  return data.claims.sub as string;
};

const text = (value: unknown, max = 255) => {
  const result = String(value || "").trim();
  return result.length > 0 && result.length <= max ? result : null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const body = await req.json().catch(() => null);
    const action = text(body?.action, 32);
    if (!action) return json(400, { error: "Missing action" });

    if (action === "search") {
      const city = text(body?.city, 40);
      const limit = Number(body?.limit || 10);
      const listingId = body?.listing_id ? text(body.listing_id, 120) : undefined;
      if (!city || !CITIES.has(city)) return json(400, { error: "Unsupported city" });
      if (!Number.isInteger(limit) || limit < 1 || limit > 50) return json(400, { error: "Invalid limit" });
      return json(200, { data: unwrapRayProp(await raypropSearch(city, limit, listingId)) });
    }

    await requireUser(req);

    if (action === "quote") {
      const listing_id = text(body?.listing_id, 120);
      const check_in = text(body?.check_in, 10);
      const check_out = text(body?.check_out, 10);
      const guests = Number(body?.guests);
      if (!listing_id || !/^\d{4}-\d{2}-\d{2}$/.test(check_in || "") || !/^\d{4}-\d{2}-\d{2}$/.test(check_out || "") || !Number.isInteger(guests) || guests < 1 || guests > 20) {
        return json(400, { error: "Invalid quote details" });
      }
      return json(200, { data: unwrapRayProp(await raypropQuote({ listing_id, check_in, check_out, guests })) });
    }

    if (action === "hold") {
      const quote_id = text(body?.quote_id, 120);
      const guest_name = text(body?.guest_name, 120);
      const guest_phone = text(body?.guest_phone, 40);
      const guest_email = text(body?.guest_email, 254);
      if (!quote_id || !guest_name || !guest_phone || !guest_email || !guest_email.includes("@")) {
        return json(400, { error: "Complete guest details are required" });
      }
      return json(200, { data: unwrapRayProp(await raypropHold({ quote_id, guest_name, guest_phone, guest_email })) });
    }

    if (action === "reservation") {
      const hold_id = text(body?.hold_id, 120);
      if (!hold_id) return json(400, { error: "Missing hold" });
      return json(200, { data: unwrapRayProp(await raypropReservation(hold_id)) });
    }

    if (action === "status") {
      const reservation_id = text(body?.reservation_id, 120);
      if (!reservation_id) return json(400, { error: "Missing reservation" });
      return json(200, { data: unwrapRayProp(await raypropReservationStatus(reservation_id)) });
    }

    return json(400, { error: "Unsupported action" });
  } catch (error) {
    console.error("[rayprop-api] error", error);
    const message = error instanceof Error ? error.message : "RayProp request failed";
    return json(message === "Unauthorized" ? 401 : 502, { error: message });
  }
});
