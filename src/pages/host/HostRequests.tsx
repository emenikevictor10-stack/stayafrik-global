import { useState } from "react";
import { toast } from "sonner";
import { TopBar } from "@/components/shell/TopBar";
import { supabase } from "@/integrations/supabase/client";
import { useHostBookings } from "@/hooks/useHostBookings";
import { HostBookingCard } from "@/components/host/HostBookingCard";
import { Button, EmptyState, ErrorState, ListSkeleton, Sheet } from "@/ui/kit";
import { timeLeft } from "@/lib/host-portal";

const HostRequests = () => {
  const { rows, loading, error, reload } = useHostBookings();
  const [busy, setBusy] = useState<string | null>(null);
  const [declining, setDeclining] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const requests = rows.filter((r) => r.status === "awaiting_host");

  const answer = async (id: string, action: "accept" | "decline") => {
    setBusy(id);
    const { data, error: e } = await supabase.functions.invoke("booking-requests", { body: { booking_id: id, action, reason: reason || undefined } });
    setBusy(null);
    if (e || (data as any)?.error) return toast.error((data as any)?.error || "Couldn't save. Try again.");
    toast.success(action === "accept" ? "Booking confirmed" : "Request declined. The guest gets a full refund.");
    setDeclining(null); setReason(""); reload();
  };

  return (
    <>
      <TopBar title="Requests" />
      <main className="px-4 pt-4 pb-8 max-w-3xl mx-auto space-y-3">
        <p className="text-sm text-muted-foreground">These guests have paid. Accept or decline before the time runs out, or they get a full refund.</p>
        {loading ? <ListSkeleton /> : error ? <ErrorState onRetry={reload} /> : requests.length === 0 ? (
          <EmptyState title="No requests waiting" body="When a guest asks to book a Request-to-book stay, it shows here." />
        ) : requests.map((r) => (
          <HostBookingCard key={r.id} r={r}>
            <p className="text-xs font-semibold">{timeLeft(r.host_respond_by)}</p>
            <div className="flex gap-2">
              <Button className="flex-1" loading={busy === r.id} onClick={() => answer(r.id, "accept")}>Accept</Button>
              <Button className="flex-1" variant="secondary" disabled={busy === r.id} onClick={() => setDeclining(r.id)}>Decline</Button>
            </div>
          </HostBookingCard>
        ))}
      </main>
      <Sheet open={!!declining} onOpenChange={(o) => !o && setDeclining(null)} title="Decline this request?">
        <p className="text-sm text-muted-foreground">The guest gets a full refund. You can tell them why (optional).</p>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={3} placeholder="Reason (optional)"
          className="mt-3 w-full rounded-xl bg-card border border-border px-3 py-2 text-sm" />
        <Button className="mt-3 w-full" variant="secondary" loading={busy === declining} onClick={() => declining && answer(declining, "decline")}>Decline and refund</Button>
      </Sheet>
    </>
  );
};
export default HostRequests;
