import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMyReservations, updateReservationStatus, type Reservation } from "@/hooks/useReservations";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Seo } from "@/components/seo/Seo";
import { toast } from "sonner";
import { Clock, CheckCircle2, XCircle, Hourglass } from "lucide-react";

type Meta = { title: string; image: string | null };

const useCountdown = (iso: string | null) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!iso) return;
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [iso]);
  if (!iso) return null;
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return "expired";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m left`;
};

const StatusChip = ({ status }: { status: Reservation["status"] }) => {
  const map: Record<Reservation["status"], { icon: JSX.Element; cls: string; label: string }> = {
    pending: { icon: <Hourglass className="w-3 h-3" />, cls: "bg-warning/10 text-warning border-warning/30", label: "Pending" },
    approved: { icon: <CheckCircle2 className="w-3 h-3" />, cls: "bg-success/10 text-success border-success/30", label: "Approved" },
    rejected: { icon: <XCircle className="w-3 h-3" />, cls: "bg-destructive/10 text-destructive border-destructive/30", label: "Declined" },
    expired: { icon: <Clock className="w-3 h-3" />, cls: "bg-muted text-muted-foreground border-border", label: "Expired" },
    cancelled: { icon: <XCircle className="w-3 h-3" />, cls: "bg-muted text-muted-foreground border-border", label: "Cancelled" },
  };
  const m = map[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-bold ${m.cls}`}>
      {m.icon} {m.label}
    </span>
  );
};

const ReservationCard = ({ r, meta, isHost, onChange }: { r: Reservation; meta?: Meta; isHost: boolean; onChange: () => void }) => {
  const countdown = useCountdown(r.status === "approved" ? r.expires_at : null);
  const [busy, setBusy] = useState(false);

  const act = async (status: Reservation["status"], reason?: string) => {
    setBusy(true);
    const { error } = await updateReservationStatus(r.id, status, reason);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Reservation ${status}`);
    onChange();
  };

  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      <div className="flex gap-3 p-3">
        {meta?.image && (
          <img src={meta.image} alt="" className="w-20 h-20 rounded-xl object-cover shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <Link to={`/property/${r.listing_id}`} className="font-bold text-sm truncate">{meta?.title || "Listing"}</Link>
            <StatusChip status={r.status} />
          </div>
          {r.visit_at && (
            <div className="text-xs text-muted-foreground mt-1">🗓️ Visit: {new Date(r.visit_at).toLocaleString()}</div>
          )}
          {r.note && <div className="text-xs mt-1 text-muted-foreground line-clamp-2">"{r.note}"</div>}
          {r.status === "approved" && countdown && (
            <div className="text-xs mt-1 font-semibold text-primary">⏳ {countdown}</div>
          )}
          {r.status === "rejected" && r.rejection_reason && (
            <div className="text-xs mt-1 text-destructive">Reason: {r.rejection_reason}</div>
          )}
        </div>
      </div>
      {isHost && r.status === "pending" && (
        <div className="flex gap-2 border-t border-border p-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-destructive"
            disabled={busy}
            onClick={() => {
              const reason = window.prompt("Reason for declining (optional):") || undefined;
              act("rejected", reason);
            }}
          >
            Decline
          </Button>
          <Button size="sm" className="flex-1" disabled={busy} onClick={() => act("approved")}>
            Approve (4h hold)
          </Button>
        </div>
      )}
      {!isHost && r.status === "pending" && (
        <div className="border-t border-border p-2">
          <Button variant="ghost" size="sm" className="w-full text-destructive" disabled={busy} onClick={() => act("cancelled")}>
            Cancel request
          </Button>
        </div>
      )}
    </div>
  );
};

const Reservations = () => {
  const { user } = useAuth();
  const { items, loading, refresh } = useMyReservations();
  const [meta, setMeta] = useState<Record<string, Meta>>({});

  useEffect(() => {
    (async () => {
      const ids = Array.from(new Set(items.map((r) => r.listing_id)));
      if (!ids.length) return;
      const { data } = await supabase.from("listings").select("id, title, images").in("id", ids);
      const m: Record<string, Meta> = {};
      for (const l of (data as any[]) || []) {
        m[l.id] = { title: l.title, image: (l.images && l.images[0]) || null };
      }
      setMeta(m);
    })();
  }, [items]);

  const { incoming, outgoing } = useMemo(() => {
    const inc: Reservation[] = [];
    const out: Reservation[] = [];
    for (const r of items) {
      if (user && r.host_id === user.id) inc.push(r);
      if (user && r.guest_id === user.id) out.push(r);
    }
    return { incoming: inc, outgoing: out };
  }, [items, user]);

  return (
    <main className="px-5 pt-6 pb-32 max-w-md md:max-w-2xl mx-auto">
      <Seo title="Reservations — Stay" description="Manage 4-hour viewing holds." />
      <h1 className="text-2xl font-extrabold tracking-tight">Reservations</h1>
      <p className="text-sm text-muted-foreground mt-1">Request a 4-hour hold to visit before booking.</p>

      {loading ? (
        <div className="mt-8 flex justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : (
        <>
          {incoming.length > 0 && (
            <section className="mt-6">
              <h2 className="text-xs font-bold text-muted-foreground mb-2">Incoming ({incoming.length})</h2>
              <div className="space-y-3">
                {incoming.map((r) => (
                  <ReservationCard key={r.id} r={r} meta={meta[r.listing_id]} isHost onChange={refresh} />
                ))}
              </div>
            </section>
          )}
          <section className="mt-6">
            <h2 className="text-xs font-bold text-muted-foreground mb-2">Your requests</h2>
            {outgoing.length === 0 ? (
              <div className="text-center py-10 rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
                No requests yet. Tap "Reserve for viewing" on any property.
              </div>
            ) : (
              <div className="space-y-3">
                {outgoing.map((r) => (
                  <ReservationCard key={r.id} r={r} meta={meta[r.listing_id]} isHost={false} onChange={refresh} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
};

export default Reservations;
