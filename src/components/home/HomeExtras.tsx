import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, ChevronRight, MapPin } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { usePopularPlaces } from "@/hooks/useLocationSearch";

type NextTrip = { id: string; check_in_date: string; check_out_date: string; listings: { title: string; city: string | null } | null };
const fmt = (d: string) => new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short" });

/** Small rows shown above the stays list when no search is active: next trip + popular places. */
export const HomeExtras = () => {
  const { user } = useAuth();
  const places = usePopularPlaces();
  const [trip, setTrip] = useState<NextTrip | null>(null);
  useEffect(() => {
    if (!user) { setTrip(null); return; }
    const today = new Date().toISOString().slice(0, 10);
    supabase.from("bookings").select("id,check_in_date,check_out_date,listings(title,city)")
      .eq("guest_id", user.id).gte("check_out_date", today)
      .in("status", ["paid", "confirmed", "escrow", "held"]).order("check_in_date").limit(1)
      .then(({ data }) => setTrip(((data as unknown as NextTrip[]) || [])[0] || null));
  }, [user]);

  if (!trip && !places.length) return null;
  return (
    <div className="mt-4 space-y-3">
      {trip && (
        <Link to="/trips" className="flex items-center gap-3 rounded-xl border border-border p-3 hover:bg-surface">
          <CalendarDays className="w-5 h-5 text-primary" aria-hidden />
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold truncate">Your next trip: {trip.listings?.title || "Stay"}</p>
            <p className="text-[13px] text-muted-foreground">{fmt(trip.check_in_date)} – {fmt(trip.check_out_date)}{trip.listings?.city ? ` · ${trip.listings.city}` : ""}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>
      )}
      {places.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {places.slice(0, 10).map((p) => (
            <Link key={p.id} to={`/results?where=${encodeURIComponent(p.name)}&loc=${p.slug}&loc_type=${p.type}`}
              className="shrink-0 min-h-11 px-3.5 inline-flex items-center gap-1.5 rounded-lg border border-border text-[13px] font-medium hover:bg-surface">
              <MapPin className="w-3.5 h-3.5" aria-hidden /> {p.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
