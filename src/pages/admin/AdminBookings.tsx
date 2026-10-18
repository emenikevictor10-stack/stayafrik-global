import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Seo } from "@/components/seo/Seo";
import { logAdminAction } from "@/lib/admin-audit";
import { Input } from "@/components/ui/input";

type Row = {
  id: string;
  listing_id: string | null;
  guest_id: string;
  check_in_date: string;
  check_out_date: string;
  total_price: number;
  status: string;
  source: string;
  listing_code: string | null;
  partner_title: string | null;
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
  needs_attention: "bg-warning/15 text-warning",
};

const STATUSES = ["all", "pending", "confirmed", "released", "cancelled", "refunded", "needs_attention"];

const AdminBookings = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let query = supabase
      .from("bookings")
      .select("id, listing_id, guest_id, check_in_date, check_out_date, total_price, status, source, listing_code, partner_title, created_at, listing:listings(title, host_id)")
      .order("created_at", { ascending: false })
      .limit(300);
    if (filter !== "all") query = query.eq("status", filter);
    const { data, error } = await query;
    if (error) toast.error(error.message);
    setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase().replace(/[·\s]/g, "");
    if (!t) return rows;
    return rows.filter((r) =>
      [r.listing_code, r.listing?.title, r.partner_title, r.id].some((v) => (v || "").toLowerCase().replace(/[·\s]/g, "").includes(t)),
    );
  }, [rows, q]);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("bookings").update({ status, ...(status === "released" ? { released_at: new Date().toISOString() } : {}) }).eq("id", id);
    if (error) return toast.error(error.message);
    await logAdminAction({ action: `booking_${status}`, entityType: "booking", entityId: id });
    toast.success(`Booking ${status}`);
    load();
  };

  const refund = async (r: Row) => {
    const input = window.prompt(`Refund amount in ₦ (max ${Number(r.total_price)}). This cancels the booking and sends the money back via Paystack.`, String(Number(r.total_price)));
    if (input === null) return;
    const amount = Number(input.replace(/[^\d.]/g, ""));
    if (!Number.isFinite(amount) || amount < 0 || amount > Number(r.total_price)) return toast.error("Invalid amount");
    const { data, error } = await supabase.functions.invoke("cancel-booking", { body: { booking_id: r.id, amount, reason: "Admin refund" } });
    if (error || (data as any)?.error) return toast.error((data as any)?.error || error?.message || "Refund failed");
    await logAdminAction({ action: "booking_refund", entityType: "booking", entityId: r.id, metadata: { amount, listing_code: r.listing_code } });
    toast.success("Refund started");
    load();
  };

  const title = (r: Row) => r.listing?.title || r.partner_title || "Listing";

  return (
    <>
      <Seo title="Bookings | Stay admin" description="Manage bookings and escrow." noindex />
      <header className="mb-5 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold">Bookings</h1>
          <p className="text-sm text-muted-foreground">Local and partner bookings, escrow release and refunds.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search listing ID or title" className="pl-9" />
        </div>
      </header>

      <div className="flex gap-1 flex-wrap mb-4">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full capitalize ${filter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-14 rounded-xl bg-secondary animate-pulse" />)}</div>
      ) : shown.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">No bookings match.</div>
      ) : (
        <div className="space-y-2">
          {shown.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-3 md:px-4 flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold truncate">{title(r)}</span>
                  {r.listing_code && <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{r.listing_code.replace(/^RP-/, "RP·")}</span>}
                  {r.source === "rayprop" && <span className="text-[10px] font-bold text-primary">Partner</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(r.check_in_date).toLocaleDateString()} → {new Date(r.check_out_date).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3 justify-between md:justify-end">
                <span className="font-bold text-sm">{formatNaira(Number(r.total_price))}</span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status] || "bg-secondary"}`}>{r.status.replace("_", " ")}</span>
                <div className="flex gap-1">
                  {r.status === "confirmed" && r.source !== "rayprop" && (
                    <button onClick={() => setStatus(r.id, "released")} className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-success/40 text-success hover:bg-success/10">Release</button>
                  )}
                  {r.status === "confirmed" && r.source !== "rayprop" && (
                    <button onClick={() => refund(r)} className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10">Refund</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default AdminBookings;
