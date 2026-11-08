import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { TopBar } from "@/components/shell/TopBar";
import { useAuth } from "@/contexts/AuthContext";
import { useMyListings } from "@/hooks/useListings";
import { RateCalendar } from "@/components/host/RateCalendar";
import { EmptyState, ListSkeleton } from "@/ui/kit";

const HostCalendar = () => {
  const { user } = useAuth();
  const { data, loading } = useMyListings(user?.id);
  const [params, setParams] = useSearchParams();
  const [id, setId] = useState(params.get("listing") || "");
  useEffect(() => { if (!id && data[0]) setId(data[0].id); }, [data]);
  return (
    <>
      <TopBar title="Calendar" />
      <main className="px-4 pt-4 pb-8 max-w-3xl mx-auto">
        {loading ? <ListSkeleton rows={2} /> : data.length === 0 ? (
          <EmptyState title="No stays yet" action={<Link to="/listings/new" className="underline font-semibold">List your first place</Link>} />
        ) : (
          <>
            <label className="block"><span className="text-xs text-muted-foreground">Stay</span>
              <select value={id} onChange={(e) => { setId(e.target.value); setParams({ listing: e.target.value }); }}
                className="mt-1 w-full min-h-11 rounded-xl bg-card border border-border px-3 text-sm">
                {data.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </label>
            {id && <RateCalendar key={id} listingId={id} />}
          </>
        )}
      </main>
    </>
  );
};
export default HostCalendar;
