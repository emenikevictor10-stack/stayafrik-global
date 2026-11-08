import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, MapPin, CalendarDays, ChevronRight } from "lucide-react";
import { TopBar } from "@/components/shell/TopBar";
import { Seo } from "@/components/seo/Seo";
import { usePopularPlaces } from "@/hooks/useLocationSearch";
import { useListings } from "@/hooks/useListings";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PropertyCard } from "@/components/property/PropertyCard";
import { StayById } from "@/components/property/StayById";
import { recentlyViewed } from "@/hooks/useRecentlyViewed";
import { Skeleton } from "@/ui/kit";

type NextTrip = { id: string; check_in_date: string; check_out_date: string; listings: { title: string; city: string | null } | null };

const fmt = (d: string) => new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short" });

const Section = ({ title, to, children }: { title: string; to?: string; children: React.ReactNode }) => (
  <section className="mt-8">
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {to && <Link to={to} className="text-sm font-semibold text-primary inline-flex items-center">See all <ChevronRight className="w-4 h-4" /></Link>}
    </div>
    {children}
  </section>
);

const Home = () => {
  const { user } = useAuth();
  const places = usePopularPlaces();
  const { data, loading } = useListings();
  const [trip, setTrip] = useState<NextTrip | null>(null);
  const recent = recentlyViewed().slice(0, 4);

  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    supabase.from("bookings")
      .select("id,check_in_date,check_out_date,listings(title,city)")
      .eq("guest_id", user.id).gte("check_out_date", today)
      .in("status", ["paid", "confirmed", "escrow", "held"])
      .order("check_in_date").limit(1)
      .then(({ data }) => setTrip(((data as any[]) || [])[0] || null));
  }, [user]);

  return (
    <>
      <Seo title="Stay · Shortlets across Nigeria" description="Find and book verified shortlet apartments across Nigeria." />
      <TopBar title="Home" />
      <main className="px-4 md:px-0 py-5">
        <h1 className="text-2xl font-semibold">Where are you staying next?</h1>
        <Link to="/search" className="mt-4 flex items-center gap-3 h-[52px] px-4 rounded-full border border-border bg-background shadow-search text-muted-foreground hover:text-foreground">
          <Search className="w-5 h-5" aria-hidden /> <span className="text-base">Search places, dates, guests</span>
        </Link>

        {trip && (
          <Link to="/trips" className="mt-6 flex items-center gap-3 rounded-xl border border-border p-4 hover:bg-surface">
            <CalendarDays className="w-5 h-5 text-primary" aria-hidden />
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold truncate">Your next trip: {trip.listings?.title || "Stay"}</p>
              <p className="text-sm text-muted-foreground">{fmt(trip.check_in_date)} – {fmt(trip.check_out_date)}{trip.listings?.city ? ` · ${trip.listings.city}` : ""}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        )}

        {places.length > 0 && (
          <Section title="Popular places">
            <div className="flex flex-wrap gap-2">
              {places.map((p) => (
                <Link key={p.id} to={`/explore?where=${encodeURIComponent(p.name)}&loc=${p.slug}&loc_type=${p.type}`}
                  className="h-11 px-4 inline-flex items-center gap-2 rounded-full border border-border text-sm font-semibold hover:bg-surface">
                  <MapPin className="w-4 h-4 text-primary" aria-hidden /> {p.name}
                </Link>
              ))}
            </div>
          </Section>
        )}

        {recent.length > 0 && (
          <Section title="Recently viewed">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{recent.map((id) => <StayById key={id} id={id} />)}</div>
          </Section>
        )}

        <Section title="Stays to try" to="/explore">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="aspect-[4/5] rounded-xl" />)}</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{data.slice(0, 8).map((p) => <PropertyCard key={p.id} p={p} />)}</div>
          )}
        </Section>
      </main>
    </>
  );
};

export default Home;
