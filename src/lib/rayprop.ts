import { supabase } from "@/integrations/supabase/client";

export type RayPropQuote = {
  id: string;
  total: number;
  subtotal?: number;
  currency?: string;
  expiresAt?: string | null;
};

export type RayPropRecord = Record<string, unknown>;

const call = async <T>(body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke("rayprop-api", { body });
  if (error) throw new Error(error.message || "RayProp is unavailable");
  if (data?.error) throw new Error(data.error);
  return data?.data as T;
};

export const searchRayProp = async (city: string, limit = 10) =>
  call<RayPropRecord[]>({ action: "search", city, limit });

export const getRayPropListing = async (listingId: string, city = "Lagos") =>
  call<RayPropRecord[]>({ action: "search", city, listing_id: listingId, limit: 1 });

export const quoteRayProp = async (body: { listing_id: string; check_in: string; check_out: string; guests: number }) => {
  const raw = await call<RayPropRecord>({ action: "quote", ...body });
  const value = (raw?.quote || raw) as RayPropRecord;
  const id = String(value?.id || value?.quote_id || value?.quoteId || "");
  const total = Number(value?.total ?? value?.total_price ?? value?.amount ?? value?.price ?? 0);
  if (!id || !Number.isFinite(total) || total <= 0) throw new Error("RayProp returned an invalid quote");
  return {
    id,
    total,
    subtotal: Number(value?.subtotal ?? value?.base_amount ?? 0) || undefined,
    currency: String(value?.currency || "NGN"),
    expiresAt: value?.expires_at ? String(value.expires_at) : null,
  } satisfies RayPropQuote;
};

export const holdRayProp = (body: { quote_id: string; guest_name: string; guest_phone: string; guest_email: string }) =>
  call<RayPropRecord>({ action: "hold", ...body });

export const normalizeHoldId = (raw: RayPropRecord) => String(raw?.hold_id || raw?.id || raw?.holdId || "");

export const rememberRayPropListing = (property: unknown) => {
  try { sessionStorage.setItem("stay:rayprop:last-listing", JSON.stringify(property)); } catch { /* storage is optional */ }
};
