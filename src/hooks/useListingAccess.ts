import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const PAID_STATUSES = ["confirmed", "paid", "completed", "released"];

/**
 * Exact address / pin is only revealed once the guest has actually paid for
 * the stay (or is the host / an admin viewing their own listing).
 */
export const useListingAccess = (listingId?: string, hostId?: string | null) => {
  const { user } = useAuth();
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!listingId || !user) {
        if (active) { setUnlocked(false); setLoading(false); }
        return;
      }
      if (hostId && hostId === user.id) {
        if (active) { setUnlocked(true); setLoading(false); }
        return;
      }
      const { data } = await supabase
        .from("bookings")
        .select("id,status")
        .eq("listing_id", listingId)
        .eq("guest_id", user.id)
        .in("status", PAID_STATUSES)
        .limit(1);
      if (!active) return;
      setUnlocked(!!(data && data.length));
      setLoading(false);
    })();
    return () => { active = false; };
  }, [listingId, hostId, user?.id]);

  return { unlocked, loading };
};

/** Drop the street-level part of a location string, keeping the area/city. */
export const approxLocation = (location: string) => {
  const parts = location.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length > 1) return parts.slice(1).join(", ");
  return parts[0] || "";
};
