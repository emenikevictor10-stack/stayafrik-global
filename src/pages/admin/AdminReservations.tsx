import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Seo } from "@/components/seo/Seo";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateReservationStatus, type Reservation } from "@/hooks/useReservations";
import { logAdminAction } from "@/lib/admin-audit";

type Row = {
  id: string;
  status: string;
  visit_at: string | null;
  expires_at: string | null;
  note: string | null;
  created_at: string;
  guest_id: string;
  host_id: string;
  listing_id: string;
  rejection_reason: string | null;
  listing?: { title: string; listing_code: string | null; images: string[] | null } | null;
};
type Person = { name: string; email: string | null; phone: string | null };

const STATUSES = ["all", "pending", "approved", "expired", "rejected", "cancelled"];
const COLORS: Record<string, string> = {
  pending: "bg-warning/15 text-warning",
  approved: "bg-primary/15 text-primary",
  expired: "bg-muted text-muted-foreground",
  rejected: "bg-destructive/15 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};
const fmt = (d: string | null) => (d ? new Date(d).toLocaleString() : "—");

type Action = { status: Reservation["status"]; label: string };
const ACTIONS: Record<string, Action[]> = {
  pending: [{ status: "approved", label: "Approve" }, { status: "rejected", label: "Decline" }],
  approved: [{ status: "cancelled", label: "Cancel hold" }],
};

const PersonBlock = ({ title, p }: { title: string; p?: Person }) => (
  <div className="rounded-lg bg-secondary/60 p-2.5 text-xs">
    <p className="font-bold text-xs text-muted-foreground">{title}</p>
    <p className="font-semibold text-sm">{p?.name || "…"}</p>
    {p?.email && <a href={`mailto:${p.email}`} className="block text-primary truncate">{p.email}</a>}
    {p?.phone && <a href={`tel:${p.phone}`} className="block text-primary">{p.phone}</a>}
  </div>
);

const AdminReservations = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Row | null>(null);
  const [confirm, setConfirm] = useState<Action | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("reservations")
      .select("id, status, visit_at, expires_at, note, created_at, guest_id, host_id, listing_id, rejection_reason, listing:listings(title, listing_code, images)")
      .order("created_at", { ascending: false })
      .limit(300);
    if (filter !== "all") q = q.eq("status", filter);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    const list = (data as any as Row[]) || [];
    setRows(list);
    const ids = [...new Set(list.flatMap((r) => [r.guest_id, r.host_id]))];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name, email, phone, whatsapp").in("user_id", ids);
      setPeople(Object.fromEntries((profs || []).map((p: any) => [p.user_id, {
        name: p.full_name || p.email || "User", email: p.email, phone: p.phone || p.whatsapp,
      }])));
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const close = () => { setOpen(null); setConfirm(null); setReason(""); };

  const run = async () => {
    if (!open || !confirm) return;
    setBusy(true);
    const r = reason.trim();
    const { error } = await updateReservationStatus(open.id, confirm.status, confirm.status === "rejected" && r ? r : undefined);
    setBusy(false);
    if (error) return toast.error(error.message);
    await logAdminAction({
      action: `viewing_${confirm.status}`, entityType: "reservation", entityId: open.id,
      metadata: { listing_code: open.listing?.listing_code, reason: r || null },
    });
    toast.success(`Viewing ${confirm.status === "approved" ? "approved" : confirm.status === "rejected" ? "declined" : "cancelled"}`);
    close();
    load();
  };

  return (
    <>
      <Seo title="Viewings | Stay admin" description="Viewing requests." noindex />
      <header className="mb-5">
        <h1 className="text-2xl font-extrabold">Viewings</h1>
        <p className="text-sm text-muted-foreground">4-hour viewing requests between guests and hosts. Tap one for details.</p>
      </header>
      <div className="flex gap-1 flex-wrap mb-4">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full capitalize ${filter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
            {s === "rejected" ? "declined" : s}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-14 rounded-xl bg-secondary animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">No viewing requests.</div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <button key={r.id} onClick={() => setOpen(r)}
              className="w-full text-left rounded-xl border border-border bg-card p-3 md:px-4 flex flex-col md:flex-row md:items-center gap-2 md:gap-4 hover:border-primary/40 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold truncate">{r.listing?.title || "Listing"}</span>
                  {r.listing?.listing_code && <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{r.listing.listing_code}</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Guest: {people[r.guest_id]?.name || "…"} · Host: {people[r.host_id]?.name || "…"}
                </p>
                <p className="text-xs text-muted-foreground">Requested {fmt(r.created_at)} · Visit {fmt(r.visit_at)}</p>
              </div>
              <span className={`self-start md:self-center text-xs font-bold px-2 py-0.5 rounded-full ${COLORS[r.status] || "bg-secondary"}`}>{r.status === "rejected" ? "declined" : r.status}</span>
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!open} onOpenChange={(v) => !v && close()}>
        <DialogContent className="max-w-md">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>{confirm ? `${confirm.label}?` : "Viewing request"}</DialogTitle>
                <DialogDescription>
                  {confirm
                    ? confirm.status === "approved"
                      ? "Starts a 4-hour hold (from the visit time if one was picked). The guest is notified and emailed."
                      : confirm.status === "rejected"
                        ? "The guest is notified and emailed that the request was declined."
                        : "Ends the hold now. The stay becomes free for others."
                    : open.listing?.title}
                </DialogDescription>
              </DialogHeader>

              {!confirm ? (
                <div className="space-y-3">
                  {open.listing?.images?.[0] && (
                    <img src={open.listing.images[0]} alt="" className="w-full h-36 object-cover rounded-lg" />
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-muted-foreground">{open.listing?.listing_code}</span>
                    <Link to={`/property/${open.listing_id}`} className="text-primary font-semibold">Open stay →</Link>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <PersonBlock title="Guest" p={people[open.guest_id]} />
                    <PersonBlock title="Host" p={people[open.host_id]} />
                  </div>
                  <dl className="text-xs grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                    <dt className="text-muted-foreground">Status</dt><dd className="font-semibold capitalize">{open.status === "rejected" ? "declined" : open.status}</dd>
                    <dt className="text-muted-foreground">Requested</dt><dd>{fmt(open.created_at)}</dd>
                    <dt className="text-muted-foreground">Visit time</dt><dd>{fmt(open.visit_at)}</dd>
                    <dt className="text-muted-foreground">Hold ends</dt><dd>{fmt(open.expires_at)}</dd>
                    {open.rejection_reason && (<><dt className="text-muted-foreground">Reason</dt><dd>{open.rejection_reason}</dd></>)}
                  </dl>
                  {open.note && <p className="text-xs italic rounded-lg bg-secondary/60 p-2.5">"{open.note}"</p>}
                </div>
              ) : confirm.status === "rejected" ? (
                <Textarea placeholder="Reason (optional, shown to the guest)" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
              ) : null}

              <DialogFooter className="gap-2">
                {confirm ? (
                  <>
                    <Button variant="ghost" onClick={() => setConfirm(null)} disabled={busy}>Back</Button>
                    <Button variant={confirm.status === "approved" ? "default" : "destructive"} onClick={run} disabled={busy}>
                      {busy ? "Saving…" : `Yes, ${confirm.label.toLowerCase()}`}
                    </Button>
                  </>
                ) : (
                  (ACTIONS[open.status] || []).map((a) => (
                    <Button key={a.status} variant={a.status === "approved" ? "default" : "outline"} onClick={() => setConfirm(a)}>
                      {a.label}
                    </Button>
                  ))
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminReservations;
