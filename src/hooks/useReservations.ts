import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type Reservation = {
  id: string;
  listing_id: string;
  guest_id: string;
  host_id: string;
  visit_at: string | null;
  note: string | null;
  status: "pending" | "approved" | "rejected" | "expired" | "cancelled";
  approved_at: string | null;
  expires_at: string | null;
  rejection_reason: string | null;
  created_at: string;
};

const applyExpiry = (r: Reservation): Reservation => {
  if (r.status === "approved" && r.expires_at && new Date(r.expires_at) < new Date()) {
    return { ...r, status: "expired" };
  }
  return r;
};

export const useMyReservations = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setItems([]); setLoading(false); return; }
    const { data } = await supabase
      .from("reservations")
      .select("*")
      .or(`guest_id.eq.${user.id},host_id.eq.${user.id}`)
      .order("created_at", { ascending: false });
    setItems(((data as Reservation[]) || []).map(applyExpiry));
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  return { items, loading, refresh };
};

export const createReservation = async (payload: {
  listing_id: string;
  guest_id: string;
  host_id: string;
  visit_at: string | null;
  note: string | null;
}) => {
  const { data, error } = await supabase.from("reservations").insert(payload).select().single();
  return { data: data as Reservation | null, error };
};

export const updateReservationStatus = async (
  id: string,
  status: Reservation["status"],
  rejection_reason?: string,
) => {
  const patch: { status: Reservation["status"]; rejection_reason?: string } = { status };
  if (rejection_reason !== undefined) patch.rejection_reason = rejection_reason;
  const { error } = await supabase.from("reservations").update(patch).eq("id", id);
  return { error };
};
