import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Search, Star, EyeOff, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logAdminAction } from "@/lib/admin-audit";

type Row = {
  id: string; rating: number; comment: string | null; created_at: string; hidden: boolean;
  guest_id: string; listing_id: string; booking_id: string;
  listings: { title: string; listing_code: string | null } | null;
};

const AdminReviews = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(true);
  const [q, setQ] = useState("");
  const [stars, setStars] = useState<number | "all">("all");
  const [show, setShow] = useState<"all" | "visible" | "hidden">("all");

  const load = async () => {
    setBusy(true);
    const { data } = await supabase.from("reviews")
      .select("id,rating,comment,created_at,hidden,guest_id,listing_id,booking_id,listings(title,listing_code)")
      .order("created_at", { ascending: false }).limit(500);
    const list = (data as any as Row[]) || [];
    setRows(list);
    const ids = [...new Set(list.map((r) => r.guest_id))];
    if (ids.length) {
      const { data: p } = await supabase.from("profiles").select("user_id,full_name,email").in("user_id", ids);
      setNames(Object.fromEntries((p || []).map((x) => [x.user_id, x.full_name || x.email || "Guest"])));
    }
    setBusy(false);
  };
  useEffect(() => { load(); }, []);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((r) =>
      (stars === "all" || r.rating === stars) &&
      (show === "all" || (show === "hidden") === r.hidden) &&
      (!t || [r.listings?.title, r.listings?.listing_code, r.comment, names[r.guest_id]].some((v) => (v || "").toLowerCase().includes(t))));
  }, [rows, q, stars, show, names]);

  const toggle = async (r: Row) => {
    const { error } = await supabase.from("reviews").update({ hidden: !r.hidden }).eq("id", r.id);
    if (error) return toast.error("Could not update review");
    await logAdminAction({ action: r.hidden ? "review_restored" : "review_hidden", entityType: "review", entityId: r.id,
      metadata: { listing_code: r.listings?.listing_code, rating: r.rating } });
    toast.success(r.hidden ? "Review restored" : "Review hidden");
    load();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-4">
      <div>
        <h1 className="text-xl font-extrabold">Reviews</h1>
        <p className="text-xs text-muted-foreground">Guest reviews on your stays. Hidden reviews don't count toward a stay's rating.</p>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search stay, listing ID, guest, comment"
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-card border border-border text-sm" />
        </div>
        <select value={String(stars)} onChange={(e) => setStars(e.target.value === "all" ? "all" : Number(e.target.value))}
          className="px-3 py-2 rounded-xl bg-card border border-border text-sm">
          <option value="all">All ratings</option>
          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} stars</option>)}
        </select>
        <select value={show} onChange={(e) => setShow(e.target.value as any)} className="px-3 py-2 rounded-xl bg-card border border-border text-sm">
          <option value="all">Visible & hidden</option><option value="visible">Visible</option><option value="hidden">Hidden</option>
        </select>
      </div>

      {busy ? <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
        : shown.length === 0 ? <div className="text-center py-16 text-sm text-muted-foreground">No reviews yet.</div>
        : (
          <div className="rounded-2xl border border-border bg-card divide-y divide-border">
            {shown.map((r) => (
              <div key={r.id} className={`p-3 flex gap-3 items-start ${r.hidden ? "opacity-60" : ""}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex">{Array.from({ length: 5 }).map((_, i) =>
                      <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? "fill-primary text-primary" : "text-muted-foreground/40"}`} />)}</span>
                    <Link to={`/property/${r.listing_id}`} target="_blank" className="text-sm font-bold truncate hover:underline">{r.listings?.title || "Stay"}</Link>
                    <span className="text-xs font-mono text-muted-foreground">{r.listings?.listing_code}</span>
                    {r.hidden && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-destructive/15 text-destructive">Hidden</span>}
                  </div>
                  {r.comment && <p className="text-xs text-muted-foreground mt-1">{r.comment}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{names[r.guest_id] || "Guest"} · {new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                <button onClick={() => toggle(r)} className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-border inline-flex items-center gap-1">
                  {r.hidden ? <><Eye className="w-3.5 h-3.5" /> Restore</> : <><EyeOff className="w-3.5 h-3.5" /> Hide</>}
                </button>
              </div>
            ))}
          </div>
        )}
    </div>
  );
};

export default AdminReviews;
