import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Seo } from "@/components/seo/Seo";
import { logAdminAction } from "@/lib/admin-audit";

type Row = {
  id: string;
  user_id: string;
  status: string;
  document_type: string | null;
  document_url: string | null;
  selfie_url: string | null;
  created_at: string;
};

const AdminKyc = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let q: any = supabase.from("kyc_submissions").select("*").order("created_at", { ascending: false }).limit(200);
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setRows(((data as any) || []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const decide = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("kyc_submissions").update({ status } as any).eq("id", id);
    if (error) return toast.error(error.message);
    await logAdminAction({ action: `kyc_${status}`, entityType: "kyc", entityId: id });
    toast.success(`KYC ${status}`);
    load();
  };

  return (
    <>
      <Seo title="KYC | Stay admin" description="Review identity submissions." noindex />
      <header className="mb-5 flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-extrabold">KYC submissions</h1>
        <div className="flex gap-1">
          {["pending", "approved", "rejected", "all"].map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`text-xs font-semibold px-3 py-1.5 rounded-full ${filter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{s}</button>
          ))}
        </div>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No submissions.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-mono text-xs text-muted-foreground">{r.user_id.slice(0, 8)}…</p>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-secondary">{r.status}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{r.document_type || "—"} · {new Date(r.created_at).toLocaleDateString()}</p>
              <div className="flex gap-2 mb-3">
                {r.document_url && <a className="text-xs text-primary underline" href={r.document_url} target="_blank" rel="noreferrer">View ID</a>}
                {r.selfie_url && <a className="text-xs text-primary underline" href={r.selfie_url} target="_blank" rel="noreferrer">View selfie</a>}
              </div>
              {r.status === "pending" && (
                <div className="flex gap-2">
                  <button onClick={() => decide(r.id, "approved")} className="flex-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-success/40 text-success hover:bg-success/10 inline-flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button onClick={() => decide(r.id, "rejected")} className="flex-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10 inline-flex items-center justify-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default AdminKyc;
