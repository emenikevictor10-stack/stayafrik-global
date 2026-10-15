import { useEffect, useState } from "react";
import { format, addMonths } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { raypropAvailability } from "@/lib/rayprop";
import { rangesToBlockedSet, type DateRange } from "@/lib/blocked-dates";

/**
 * Blocked calendar days for a listing.
 * - Local listings: active bookings via the listing_booked_ranges function (dates only, no guest data).
 * - Partner stays: RayProp's per-day availability for the next few months.
 * Failures are silent — the calendar just opens fully and server-side checks still protect the booking.
 */
export const useBlockedDates = (listingId: string | undefined, isPartner: boolean) => {
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!listingId) return;
    let active = true;
    (async () => {
      try {
        if (isPartner) {
          const from = new Date();
          const to = addMonths(from, 4);
          const days = await raypropAvailability(
            listingId,
            format(from, "yyyy-MM-dd"),
            format(to, "yyyy-MM-dd"),
          );
          const ranges: DateRange[] = [];
          // Merge consecutive unavailable days into ranges for rangesToBlockedSet.
          let runStart: string | null = null;
          let prev: string | null = null;
          for (const day of Array.isArray(days) ? days : []) {
            const date = String(day?.date || "");
            const available = day?.available !== false;
            if (!date) continue;
            if (!available && !runStart) runStart = date;
            if (available && runStart && prev) {
              // Range ends the day after the last blocked day (check-out exclusive).
              const next = new Date(prev + "T00:00:00");
              next.setDate(next.getDate() + 1);
              ranges.push({ check_in: runStart, check_out: format(next, "yyyy-MM-dd") });
              runStart = null;
            }
            prev = date;
          }
          if (runStart && prev) {
            const next = new Date(prev + "T00:00:00");
            next.setDate(next.getDate() + 1);
            ranges.push({ check_in: runStart, check_out: format(next, "yyyy-MM-dd") });
          }
          if (active) setBlocked(rangesToBlockedSet(ranges));
        } else {
          const { data, error } = await supabase.rpc("listing_booked_ranges", { _listing_id: listingId });
          if (error) throw error;
          if (active) setBlocked(rangesToBlockedSet((data as DateRange[]) || []));
        }
      } catch (e) {
        console.error("[blocked-dates] unavailable", e);
      } finally {
        if (active) setLoaded(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [listingId, isPartner]);

  return { blocked, loaded };
};
