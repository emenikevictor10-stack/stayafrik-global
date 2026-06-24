import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Seo } from "@/components/seo/Seo";
import { logAdminAction } from "@/lib/admin-audit";

type Row = {
  id: string;
  listing_id: string;
  guest_id: string;
  check_in_date: string;
  check_out_date: string;
  total_amount: number;
  status: string;
  created_at: string;
  listing?: { title: string; host_id: string } | null;
};

const formatNaira = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning/15 text-warning",
  confirmed: "bg-primary/15 text-primary",
  released: "bg-success/15 text-success",
  cancelled: "bg-muted text-muted-foreground",
  refunded: "bg-destructive/15 text-destructive",
};

const AdminBookings = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("bookings")
      .select("id, listing_id, guest_id, check_in_date, check_out_date, total_amount, status, created_at, listing:listings(title, host_id)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("bookings").update({ status, ...(status === "released" ? { released_at: new Date().toISOString() } : {}) }).eq("id", id);
    if (error) return toast.error(error.message);
    await logAdminAction({ action: `booking_${status}`, entityType: "booking", entityId: id });
    toast.success(`Booking ${status}`);
    load();
  };

  return (
    <>
      <Seo title="Bookings | Stay admin" description="Manage bookings and escrow." noindex />
      <header className="mb-5 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold">Bookings</h1>
          <p className="text-sm text-muted-foreground">{rows.length} shown</p>
        </div>
        <div className="flex gap-1 flex-wrap">
          {["all", "pending", "confirmed", "released", "cancelled", "refunded"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full ${filter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </header>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2.5">Listing</th>
              <th className="text-left px-4 py-2.5">Dates</th>
              <th className="text-left px-4 py-2.5">Amount</th>
              <th className="text-left px-4 py-2.5">Status</th>
              <th className="text-right px-4 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No bookings</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-2.5 font-semibold">{r.listing?.title || r.listing_id.slice(0, 8)}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">
                  {new Date(r.check_in_date).toLocaleDateString()} → {new Date(r.check_out_date).toLocaleDateString()}
                </td>
                <td className="px-4 py-2.5 font-bold">{formatNaira(Number(r.total_amount))}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status] || "bg-secondary"}`}>{r.status}</span>
                </td>
                <td className="px-4 py-2.5 text-right space-x-1">
                  {r.status === "confirmed" && (
                    <button onClick={() => setStatus(r.id, "released")} className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-success/40 text-success hover:bg-success/10">Release</button>
                  )}
                  {(r.status === "pending" || r.status === "confirmed") && (
                    <button onClick={() => setStatus(r.id, "refunded")} className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10">Refund</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default AdminBookings;
