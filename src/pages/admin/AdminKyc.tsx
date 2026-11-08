import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Seo } from "@/components/seo/Seo";
import { Input } from "@/components/ui/input";
import { logAdminAction } from "@/lib/admin-audit";

type Row = {
  id: string; user_id: string; status: string; id_type: string; id_number: string; id_image_url: string;
  reviewer_notes: string | null; reviewed_at: string | null; created_at: string;
};
type Person = { name: string; email: string | null; phone: string | null; is_host: boolean };

const COLORS: Record<string, string> = {
  pending: "bg-warning/15 text-warning", approved: "bg-success/15 text-success", rejected: "bg-destructive/15 text-destructive",
};
const mask = (s: string) => (s.length > 4 ? "•".repeat(Math.max(0, s.length - 4)) + s.slice(-4) : s);

const AdminKyc = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState("pending");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let query = supabase.from("kyc_submissions").select("*").order("created_at", { ascending: false }).limit(300);
    if (filter !== "all") query = query.eq("status", filter);
    const { data, error } = await query;
    if (error) toast.error(error.message);
    const list = ((data as any) || []) as Row[];
    setRows(list);
    const ids = [...new Set(list.map((r) => r.user_id))];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name, email, phone, is_host").in("user_id", ids);
      setPeople(Object.fromEntries((profs || []).map((p: any) => [p.user_id, { name: p.full_name || p.email || "User", email: p.email, phone: p.phone, is_host: p.is_host }])));
    }
    // ID images live in a private bucket — sign short-lived links.
    const signed: Record<string, string> = {};
    await Promise.all(list.filter((r) => r.id_image_url).map(async (r) => {
      if (/^https?:/.test(r.id_image_url)) { signed[r.id] = r.id_image_url; return; }
      const { data: s } = await supabase.storage.from("kyc-documents").createSignedUrl(r.id_image_url, 3600);
      if (s?.signedUrl) signed[r.id] = s.signedUrl;
    }));
    setUrls(signed);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const decide = async (r: Row, status: "approved" | "rejected") => {
    let notes: string | null = null;
    if (status === "rejected") {
      const v = window.prompt("Reason for rejecting (shown to the host):", "");
      if (v === null) return;
      notes = v.trim() || null;
    } else if (!confirm(`Approve ID for ${people[r.user_id]?.name || "this user"}?`)) return;
    const { error } = await supabase.from("kyc_submissions")
      .update({ status, reviewer_notes: notes, reviewed_at: new Date().toISOString() }).eq("id", r.id);
    if (error) return toast.error(error.message);
    await supabase.from("notifications").insert({
      user_id: r.user_id, type: "kyc",
      title: status === "approved" ? "ID verified ✅" : "ID verification declined",
      body: status === "approved" ? "Your identity has been verified." : `Your ID was not accepted.${notes ? ` Reason: ${notes}` : ""} Please resubmit.`,
      link: "/profile/verification",
    });
    await logAdminAction({ action: `kyc_${status}`, entityType: "kyc", entityId: r.id, metadata: { user_id: r.user_id, reason: notes } });
    toast.success(`ID ${status}`);
    load();
  };

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => {
      const p = people[r.user_id];
      return [r.id_type, r.id_number, r.user_id, p?.name, p?.email, p?.phone].some((v) => (v || "").toLowerCase().includes(t));
    });
  }, [rows, q, people]);

  return (
    <>
      <Seo title="KYC | Stay admin" description="Review identity submissions." noindex />
      <header className="mb-4 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold">ID checks (KYC)</h1>
          <p className="text-sm text-muted-foreground">Host identity documents waiting for review.</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email, phone, ID type or number" className="pl-9" />
        </div>
      </header>
      <div className="flex gap-1 flex-wrap mb-4">
        {["pending", "approved", "rejected", "all"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`text-xs font-semibold px-3 py-1.5 rounded-full capitalize ${filter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{s}</button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-32 rounded-xl bg-secondary animate-pulse" />)}</div>
      ) : shown.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">{rows.length ? "No submissions match." : "No submissions."}</div>
      ) : (
        <div className="space-y-3">
          {shown.map((r) => {
            const p = people[r.user_id];
            return (
              <article key={r.id} className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col sm:flex-row">
                <a href={urls[r.id]} target="_blank" rel="noreferrer" className="sm:w-56 aspect-[4/3] bg-secondary/40 shrink-0 block">
                  {urls[r.id] ? <img src={urls[r.id]} alt="ID document" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No image</div>}
                </a>
                <div className="flex-1 p-4 space-y-3 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <Link to={`/admin/users/${r.user_id}`} className="font-bold hover:text-primary">{p?.name || "…"}</Link>
                      <p className="text-xs text-muted-foreground truncate">{[p?.email, p?.phone].filter(Boolean).join(" · ")}{p?.is_host ? " · Host" : ""}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${COLORS[r.status] || "bg-secondary"}`}>{r.status}</span>
                  </div>
                  <dl className="text-xs grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                    <dt className="text-muted-foreground">ID type</dt><dd className="font-semibold">{r.id_type}</dd>
                    <dt className="text-muted-foreground">ID number</dt>
                    <dd className="font-mono">
                      {reveal[r.id] ? r.id_number : mask(r.id_number)}{" "}
                      <button onClick={() => setReveal((v) => ({ ...v, [r.id]: !v[r.id] }))} className="text-primary font-sans text-xs">{reveal[r.id] ? "Hide" : "Show"}</button>
                    </dd>
                    <dt className="text-muted-foreground">Submitted</dt><dd>{new Date(r.created_at).toLocaleString()}</dd>
                    {r.reviewed_at && (<><dt className="text-muted-foreground">Reviewed</dt><dd>{new Date(r.reviewed_at).toLocaleString()}</dd></>)}
                    {r.reviewer_notes && (<><dt className="text-muted-foreground">Notes</dt><dd>{r.reviewer_notes}</dd></>)}
                  </dl>
                  {r.status === "pending" && (
                    <div className="flex gap-2">
                      <button onClick={() => decide(r, "rejected")} className="flex-1 text-xs font-semibold px-3 py-2 rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10 inline-flex items-center justify-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                      <button onClick={() => decide(r, "approved")} className="flex-1 text-xs font-semibold px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
};

export default AdminKyc;
