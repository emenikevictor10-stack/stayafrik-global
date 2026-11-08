import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { HostBooking } from "@/lib/host-portal";

export type HostBookingRow = HostBooking & {
  listing_id: string | null; guest_count: number | null; listing_code: string | null; created_at: string;
  listings: { title: string; images: string[] } | null;
  guest_name: string; guest_phone: string | null;
};

/** The signed-in host's local bookings, with guest names limited by the host_booking_guests rule. */
export const useHostBookings = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<HostBookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError(false);
    const { data, error: e } = await supabase.from("bookings")
      .select("id, status, check_in_date, check_out_date, total_price, host_payout_kobo, host_respond_by, listing_id, guest_count, listing_code, created_at, listings(title, images)")
      .eq("host_id", user.id).neq("source", "rayprop")
      .in("status", ["awaiting_host", "confirmed", "released", "completed", "cancelled", "declined", "refunded"])
      .order("check_in_date", { ascending: true });
    if (e) { setError(true); setLoading(false); return; }
    const ids = (data ?? []).map((r) => r.id);
    const { data: names } = ids.length ? await supabase.rpc("host_booking_guests", { _booking_ids: ids }) : { data: [] };
    const byId = new Map((names ?? []).map((n: any) => [n.booking_id, n]));
    setRows((data ?? []).map((r: any) => ({ ...r, guest_name: byId.get(r.id)?.guest_name ?? "Guest", guest_phone: byId.get(r.id)?.guest_phone ?? null })));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);
  return { rows, loading, error, reload: load };
};
