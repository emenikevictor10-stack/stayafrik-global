import { useState } from "react";
import { format } from "date-fns";
import { TopBar } from "@/components/shell/TopBar";
import { useHostBookings } from "@/hooks/useHostBookings";
import { HostBookingCard } from "@/components/host/HostBookingCard";
import { EmptyState, ErrorState, ListSkeleton, Tabs } from "@/ui/kit";
import { groupBookings } from "@/lib/host-portal";
import { CancelBookingDialog } from "@/components/booking/CancelBookingDialog";

type T = "upcoming" | "current" | "past";

const HostBookings = () => {
  const { rows, loading, error, reload } = useHostBookings();
  const [tab, setTab] = useState<T>("upcoming");
  const [cancelId, setCancelId] = useState<{ id: string; total: number } | null>(null);
  const g = groupBookings(rows, format(new Date(), "yyyy-MM-dd"));
  const list = g[tab];
  return (
    <>
      <TopBar title="Bookings" />
      <main className="px-4 pt-4 pb-8 max-w-3xl mx-auto space-y-3">
        <Tabs value={tab} onChange={(v) => setTab(v as T)} tabs={[
          { value: "upcoming", label: "Upcoming", count: g.upcoming.length },
          { value: "current", label: "Current", count: g.current.length },
          { value: "past", label: "Past", count: g.past.length },
        ]} />
        {loading ? <ListSkeleton /> : error ? <ErrorState onRetry={reload} /> : list.length === 0 ? (
          <EmptyState title={tab === "current" ? "No guests staying right now" : tab === "upcoming" ? "No upcoming stays" : "No past stays yet"} />
        ) : list.map((r) => (
          <HostBookingCard key={r.id} r={r}>
            {r.status === "confirmed" && tab === "upcoming" && (
              <button onClick={() => setCancelId({ id: r.id, total: Number(r.total_price) })} className="mt-2 text-xs font-semibold text-destructive underline">Cancel this booking</button>
            )}
          </HostBookingCard>
        ))}
        {cancelId && <CancelBookingDialog as="host" bookingId={cancelId.id} total={cancelId.total} open onOpenChange={(v) => { if (!v) setCancelId(null); }} onDone={reload} />}
      </main>
    </>
  );
};
export default HostBookings;
