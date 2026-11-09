import { Tag } from "@/ui/kit";
import { ErrorState } from "@/ui/kit";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Search, Star, EyeOff, Eye, MessageSquare } from "lucide-react";
import { normaliseReply } from "../../../supabase/functions/_shared/user-block-core";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logAdminAction } from "@/lib/admin-audit";

type Row = {
  id: string; rating: number; comment: string | null; tags: string[] | null; created_at: string; hidden: boolean;
  guest_id: string; listing_id: string; booking_id: string;
  listings: { title: string; listing_code: string | null } | null;
};

const AdminReviews = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [q, setQ] = useState("");
  const [stars, setStars] = useState<number | "all">("all");
  const [show, setShow] = useState<"all" | "visible" | "hidden">("all");
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const saveReply = async (id: string, body: string) => {
    setSaving(true);
    const { error } = await supabase.rpc("staff_review_reply", { _review_id: id, _body: normaliseReply(body) ?? "" });
    setSaving(false);
    if (error) return toast.error(error.message.includes("Not allowed") ? "Only admins and listings staff can reply." : "Could not save reply");
    toast.success(normaliseReply(body) ? "Reply saved" : "Reply removed");
    setEditing(null);
    load();
  };

  const load = async () => {
    setBusy(true);
    const { data, error } = await supabase.from("reviews")
      .select("id,rating,comment,tags,created_at,hidden,guest_id,listing_id,booking_id,listings(title,listing_code)")
      .order("created_at", { ascending: false }).limit(500);
    setLoadError(!!error);
    const list = (data as any as Row[]) || [];
    setRows(list);
    if (list.length) {
      const { data: reps } = await supabase.from("review_replies").select("review_id,body").in("review_id", list.map((r) => r.id));
      setReplies(Object.fromEntries((reps || []).map((x) => [x.review_id, x.body])));
    }
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

      {loadError ? <ErrorState message="This list didn't load." onRetry={() => load()} /> : busy ? <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
        : shown.length === 0 ? <div className="text-center py-16 text-sm text-muted-foreground">No reviews yet.</div>
        : (
          <div className="rounded-2xl border border-border bg-card divide-y divide-border">
            {shown.map((r) => (
              <div key={r.id} className={`p-3 flex gap-3 items-start ${r.hidden ? "opacity-60" : ""}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex">{Array.from({ length: 5 }).map((_, i) =>
                      <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? "fill-primary text-primary" : "text-muted-foreground/40"}`} />)}</span>
                    <Link to={`/stays/${r.listing_id}`} target="_blank" className="text-sm font-bold truncate hover:underline">{r.listings?.title || "Stay"}</Link>
                    <span className="text-xs font-mono text-muted-foreground">{r.listings?.listing_code}</span>
                    {r.hidden && <Tag tone="broken">Hidden</Tag>}
                  </div>
                  {!!r.tags?.length && <p className="text-xs mt-1">{r.tags.join(" · ")}</p>}
                  {r.comment && <p className="text-xs text-muted-foreground mt-1">{r.comment}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{names[r.guest_id] || "Guest"} · {new Date(r.created_at).toLocaleDateString()}</p>
                  {editing === r.id ? (
                    <div className="mt-2 space-y-2">
                      <textarea value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={1000} rows={3} aria-label="Reply"
                        placeholder="Public reply shown under this review" className="w-full rounded-xl bg-background border border-border p-2 text-sm" />
                      <div className="flex gap-2">
                        <button disabled={saving} onClick={() => saveReply(r.id, draft)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground">Save reply</button>
                        <button onClick={() => setEditing(null)} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border">Cancel</button>
                      </div>
                    </div>
                  ) : replies[r.id] ? (
                    <div className="mt-2 rounded-lg bg-secondary/60 p-2">
                      <p className="text-xs font-semibold">Reply from Stay</p>
                      <p className="text-xs text-muted-foreground">{replies[r.id]}</p>
                      <div className="flex gap-3 mt-1">
                        <button onClick={() => { setEditing(r.id); setDraft(replies[r.id]); }} className="text-xs font-semibold underline">Edit</button>
                        <button disabled={saving} onClick={() => saveReply(r.id, "")} className="text-xs font-semibold underline text-destructive">Remove</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setEditing(r.id); setDraft(""); }} className="mt-2 text-xs font-semibold inline-flex items-center gap-1 underline">
                      <MessageSquare className="w-3.5 h-3.5" /> Reply
                    </button>
                  )}
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
