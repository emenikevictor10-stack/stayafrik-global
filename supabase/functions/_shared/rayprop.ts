const RAYPROP_BASE_URL = "https://api.rayprop.io/functions/v1/complete-api";

export class RayPropError extends Error {
  constructor(message: string, public status = 502, public code = "") { super(message); }
}

type RayPropRequest = { path: string; method?: "GET" | "POST"; body?: Record<string, unknown> };

const friendly = (status: number, code: string, message: string) => {
  if (status === 409) return "Those dates were just taken. Please pick different dates.";
  if (status === 429) return "Partner stays are busy right now. Please try again in a minute.";
  if (code === "INSUFFICIENT_BALANCE") return "Partner booking could not be confirmed. Our team has been alerted.";
  return message || "RayProp could not complete that request";
};

export const raypropFetch = async ({ path, method = "GET", body }: RayPropRequest) => {
  const apiKey = Deno.env.get("RAYPROP_API_KEY")?.trim();
  if (!apiKey) throw new RayPropError("RayProp is not configured yet", 503);

  let response: Response;
  try {
    response = await fetch(`${RAYPROP_BASE_URL}${path}`, {
      method,
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: method === "POST" ? JSON.stringify(body || {}) : undefined,
    });
  } catch (error) {
    console.error("[rayprop] network error", error);
    throw new RayPropError("RayProp is temporarily unavailable", 503);
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    const code = String(payload?.error?.code || "");
    const message = String(payload?.error?.message || payload?.message || "");
    console.error(`[rayprop] ${method} ${path.split("?")[0]} failed status=${response.status} code=${code} msg=${message}`);
    throw new RayPropError(friendly(response.status, code, message), response.status === 409 ? 409 : 502, code);
  }
  return payload;
};

export const unwrapRayProp = (payload: any) => payload?.data ?? payload;

export const raypropSearch = (city: string, limit: number, listingId?: string, q?: string, offset?: number) => {
  const query = new URLSearchParams({ city, limit: String(limit) });
  if (listingId) query.set("listing_id", listingId);
  if (q) query.set("q", q);
  if (offset) query.set("offset", String(offset));
  return raypropFetch({ path: `/listings?${query.toString()}` });
};

export const raypropAvailability = (listing_id: string, start_date: string, end_date: string) =>
  raypropFetch({ path: `/availability?${new URLSearchParams({ listing_id, start_date, end_date })}` });

export const raypropQuote = (body: {
  listing_id: string; check_in_date: string; check_out_date: string; guest_count: number; developer_markup_per_night?: number;
}) => raypropFetch({ path: "/quotes", method: "POST", body });

export const raypropGetQuote = (id: string) => raypropFetch({ path: `/quotes/${encodeURIComponent(id)}` });

export const raypropHold = (body: { quote_id: string; guest_name: string; guest_phone: string; guest_email: string }) =>
  raypropFetch({ path: "/holds", method: "POST", body });

export const raypropGetHold = (id: string) => raypropFetch({ path: `/holds/${encodeURIComponent(id)}` });

export const raypropReservation = (body: Record<string, unknown>) =>
  raypropFetch({ path: "/reservations", method: "POST", body });

export const raypropConfirmPayment = (reservationId: string, idempotency_key: string) =>
  raypropFetch({ path: `/reservations/${encodeURIComponent(reservationId)}/confirm-payment`, method: "POST", body: { idempotency_key } });

export const raypropCancel = (reservationId: string, reason: string) =>
  raypropFetch({ path: `/reservations/${encodeURIComponent(reservationId)}/cancel`, method: "POST", body: { reason, refund_requested: true } });

export const raypropReservationStatus = (reservationId: string) =>
  raypropFetch({ path: `/reservations/${encodeURIComponent(reservationId)}` });

export const raypropRegisterWebhook = (url: string, secret: string) =>
  raypropFetch({
    path: "/webhooks", method: "POST",
    body: { url, secret, events: ["reservation.created", "reservation.payment_confirmed", "reservation.booked", "reservation.cancelled", "reservation.checked_in", "reservation.completed"] },
  });

export const raypropWalletBalance = () => raypropFetch({ path: "/wallet/balance" });

/** Markup per night in kobo, configurable via RAYPROP_MARKUP_PER_NIGHT_NAIRA (default 0). */
export const markupPerNightKobo = () => Math.max(0, Math.round(Number(Deno.env.get("RAYPROP_MARKUP_PER_NIGHT_NAIRA") || 0) * 100));
