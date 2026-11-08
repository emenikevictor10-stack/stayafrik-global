import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RatePlan } from "../../supabase/functions/_shared/booking-core";

/** Host price rules for a local stay (weekend/date prices, fees, discounts, night limits). Partner stays: null. */
export const useRatePlan = (listingId: string | undefined, isPartner: boolean) => {
  const [plan, setPlan] = useState<(RatePlan & { booking_mode?: string }) | null>(null);
  useEffect(() => {
    if (!listingId || isPartner) return setPlan(null);
    let on = true;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [{ data: l }, { data: dp }] = await Promise.all([
        supabase.from("listings").select("price_per_night, weekend_price, cleaning_fee, weekly_discount_pct, monthly_discount_pct, min_nights, max_nights, booking_mode").eq("id", listingId).maybeSingle(),
        supabase.from("listing_date_prices").select("date, price").eq("listing_id", listingId).gte("date", today),
      ]);
      if (!on || !l) return;
      setPlan({ ...l, price_per_night: Number(l.price_per_night), date_prices: Object.fromEntries((dp ?? []).map((r) => [r.date, Number(r.price)])) });
    })();
    return () => { on = false; };
  }, [listingId, isPartner]);
  return plan;
};
