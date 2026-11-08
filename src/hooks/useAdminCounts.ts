import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSupportQueueCount } from "./useSupportQueueCount";
import type { AdminCountKey } from "@/components/admin/adminNav";

const head = { count: "exact" as const, head: true };

/** How many items wait for a person in each admin queue. Refreshes every minute. */
export const useAdminCounts = () => {
  const support = useSupportQueueCount();
  const [c, setC] = useState({ listings: 0, kyc: 0, payouts: 0, viewings: 0, partner: 0 });
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const db = supabase as any;
      const [l, k, p, v, pb] = await Promise.all([
        db.from("listings").select("id", head).eq("verified", false),
        db.from("kyc_submissions").select("id", head).eq("status", "pending"),
        db.from("payouts").select("id", head).eq("status", "pending"),
        db.from("reservations").select("id", head).eq("status", "pending"),
        db.from("bookings").select("id", head).eq("status", "needs_attention"),
      ]);
      if (alive) setC({ listings: l.count || 0, kyc: k.count || 0, payouts: p.count || 0, viewings: v.count || 0, partner: pb.count || 0 });
    };
    load();
    const t = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  const counts: Record<AdminCountKey, number> = { support: support.waiting, ...c };
  return { counts, overdue: support.overdue };
};
