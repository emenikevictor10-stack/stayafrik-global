import { supabase } from "@/integrations/supabase/client";

export type RayPropRecord = Record<string, any>;

export type RayPropQuote = {
  id: string;
  totalKobo: number;
  ratePerNightKobo: number;
  markupPerNightKobo: number;
  subtotalKobo: number;
  vatKobo: number;
  nights: number;
  expiresAt: string | null;
};

const call = async <T>(body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke("rayprop-api", { body });
  if (data?.error) throw new Error(data.error);
  if (error) {
    let msg = error.message;
    try { const j = await (error as any).context?.json?.(); if (j?.error) msg = j.error; } catch { /* ignore */ }
    throw new Error(msg || "Partner stays are unavailable right now");
  }
  return data?.data as T;
};

export const RAYPROP_CITIES = ["Lagos", "Abuja", "Port Harcourt"];

export type RayPropPage = { items: RayPropRecord[]; hasMore: boolean; total: number };

export const searchRayProp = async (city: string, limit = 10, opts: { page?: number; q?: string } = {}): Promise<RayPropPage> => {
  const { data, error } = await supabase.functions.invoke("rayprop-api", {
    body: { action: "search", city, limit, ...(opts.page && opts.page > 1 ? { page: opts.page } : {}), ...(opts.q ? { q: opts.q } : {}) },
  });
  if (data?.error) throw new Error(data.error);
  if (error) {
    let msg = error.message;
    try { const j = await (error as any).context?.json?.(); if (j?.error) msg = j.error; } catch { /* ignore */ }
    throw new Error(msg || "Partner stays are unavailable right now");
  }
  return { items: (data?.data as RayPropRecord[]) || [], hasMore: !!data?.meta?.hasMore, total: Number(data?.meta?.total || 0) };
};

export const getRayPropListing = async (listingId: string) => {
  const results = await Promise.allSettled(RAYPROP_CITIES.map((city) => call<RayPropRecord[]>({ action: "search", city, listing_id: listingId, limit: 1 })));
  return results.flatMap((r) => (r.status === "fulfilled" && Array.isArray(r.value) ? r.value : []));
};

export const raypropAvailability = (listing_id: string, start_date: string, end_date: string) =>
  call<RayPropRecord | null>({ action: "availability", listing_id, start_date, end_date });

export const quoteRayProp = async (body: { listing_id: string; check_in: string; check_out: string; guests: number }): Promise<RayPropQuote> => {
  const q = await call<RayPropRecord>({ action: "quote", ...body });
  const p = q?.pricing || {};
  const id = String(q?.quote_id || "");
  const totalKobo = Number(p.total_amount || 0);
  if (!id || !totalKobo) throw new Error("We couldn't get a price for those dates");
  return {
    id, totalKobo,
    ratePerNightKobo: Number(p.rayprop_price_per_night || 0),
    markupPerNightKobo: Number(p.developer_markup_per_night || 0),
    subtotalKobo: Number(p.subtotal || 0),
    vatKobo: Number(p.vat_amount || 0),
    nights: Number(p.nights || q?.dates?.nights || 0),
    expiresAt: q?.expires_at ? String(q.expires_at) : null,
  };
};

export const holdRayProp = async (body: { quote_id: string; guest_name: string; guest_phone: string; guest_email: string }) => {
  const h = await call<RayPropRecord>({ action: "hold", ...body });
  const id = String(h?.hold_id || "");
  if (!id) throw new Error("We couldn't hold those dates");
  return { id, expiresAt: h?.expires_at ? String(h.expires_at) : new Date(Date.now() + 15 * 60_000).toISOString() };
};

export const cancelRayPropBooking = (booking_id: string, reason?: string) => call<RayPropRecord>({ action: "cancel", booking_id, reason });
export const refreshRayPropStatus = (booking_id: string) => call<RayPropRecord>({ action: "status", booking_id });
export const raypropWallet = () => call<RayPropRecord | null>({ action: "wallet" });
export const raypropRegisterWebhook = () => call<RayPropRecord>({ action: "register_webhook" });
export const raypropRetry = (booking_id: string) => call<RayPropRecord>({ action: "retry", booking_id });

export const rememberRayPropListing = (property: unknown) => {
  try { sessionStorage.setItem("stay:rayprop:last-listing", JSON.stringify(property)); } catch { /* optional */ }
};
