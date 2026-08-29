const RAYPROP_BASE_URL = "https://api.rayprop.io/functions/v1/complete-api";

type RayPropRequest = {
  path: string;
  method?: "GET" | "POST";
  body?: Record<string, unknown>;
};

const raypropFetch = async ({ path, method = "GET", body }: RayPropRequest) => {
  const apiKey = Deno.env.get("RAYPROP_API_KEY")?.trim();
  if (!apiKey) throw new Error("RayProp is not configured yet");

  let response: Response;
  try {
    response = await fetch(`${RAYPROP_BASE_URL}${path}`, {
      method,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: method === "POST" ? JSON.stringify(body || {}) : undefined,
    });
  } catch (error) {
    console.error("[rayprop] network error", error);
    throw new Error("RayProp is temporarily unavailable");
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error(`[rayprop] request failed status=${response.status}`);
    throw new Error(payload?.message || payload?.error || "RayProp could not complete that request");
  }
  return payload;
};

export const raypropSearch = (city: string, limit: number, listingId?: string) => {
  const query = new URLSearchParams({ city, limit: String(limit) });
  if (listingId) query.set("listing_id", listingId);
  return raypropFetch({ path: `/listings?${query.toString()}` });
};

export const raypropQuote = (body: {
  listing_id: string;
  check_in: string;
  check_out: string;
  guests: number;
}) => raypropFetch({ path: "/quotes", method: "POST", body });

export const raypropHold = (body: {
  quote_id: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string;
}) => raypropFetch({ path: "/holds", method: "POST", body });

export const raypropReservation = (hold_id: string) =>
  raypropFetch({ path: "/reservations", method: "POST", body: { hold_id } });

export const raypropReservationStatus = (reservationId: string) =>
  raypropFetch({ path: `/reservations/${encodeURIComponent(reservationId)}` });

export const unwrapRayProp = (payload: any) => payload?.data ?? payload;
