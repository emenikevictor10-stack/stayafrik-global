import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Seo } from "@/components/seo/Seo";

type Row = {
  id: string;
  status: string;
  visit_at: string | null;
  expires_at: string | null;
  note: string | null;
  created_at: string;
  guest_id: string;
  host_id: string;
  listing?: { title: string; listing_code: string | null } | null;
};

const STATUSES = ["all", "pending", "approved", "expired", "rejected", "cancelled"];
const COLORS: Record<string, string> = {
  pending: "bg-warning/15 text-warning",
  approved: "bg-primary/15 text-primary",
  expired: "bg-muted text-muted-foreground",
  rejected: "bg-destructive/15 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};
const fmt = (d: string | null) => (d ? new Date(d).toLocaleString() : "—");

const AdminReservations = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let q = supabase
        .from("reservations")
        .select("id, status, visit_at, expires_at, note, created_at, guest_id, host_id, listing:listings(title, listing_code)")
        .order("created_at", { ascending: false })
        .limit(300);
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) toast.error(error.message);
      const list = (data as any as Row[]) || [];
      setRows(list);
      const ids = [...new Set(list.flatMap((r) => [r.guest_id, r.host_id]))];
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", ids);
        setNames(Object.fromEntries((profs || []).map((p: any) => [p.user_id, p.full_name || p.email || "User"])));
      }
      setLoading(false);
    })();
  }, [filter]);

  return (
    <>
      <Seo title="Viewings | Stay admin" description="Viewing requests." noindex />
      <header className="mb-5">
        <h1 className="text-2xl font-extrabold">Viewings</h1>
        <p className="text-sm text-muted-foreground">4-hour viewing requests between guests and hosts.</p>
      </header>
      <div className="flex gap-1 flex-wrap mb-4">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full capitalize ${filter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
            {s}
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
            <div key={r.id} className="rounded-xl border border-border bg-card p-3 md:px-4 flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold truncate">{r.listing?.title || "Listing"}</span>
                  {r.listing?.listing_code && <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{r.listing.listing_code}</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Guest: {names[r.guest_id] || "…"} · Host: {names[r.host_id] || "…"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Requested {fmt(r.created_at)} · Visit {fmt(r.visit_at)} · Hold ends {fmt(r.expires_at)}
                </p>
                {r.note && <p className="text-xs mt-1 italic text-muted-foreground truncate">"{r.note}"</p>}
              </div>
              <span className={`self-start md:self-center text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${COLORS[r.status] || "bg-secondary"}`}>{r.status}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default AdminReservations;
