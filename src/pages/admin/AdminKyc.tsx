import { kycNextStep } from "@/lib/next-step";
import { ErrorState, NextStep, Tabs } from "@/ui/kit";
import { toneFor, statusLabel } from "@/lib/status-tone";
import { Tag } from "@/ui/kit";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Seo } from "@/components/seo/Seo";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type Row = {
  id: string; user_id: string; status: string; id_type: string; id_number: string; id_image_url: string;
  reviewer_notes: string | null; country?: string | null; full_name?: string | null; reviewed_at: string | null; created_at: string;
};
type Person = { name: string; email: string | null; phone: string | null; is_host: boolean };

const mask = (s: string) => (s.length > 4 ? "•".repeat(Math.max(0, s.length - 4)) + s.slice(-4) : s);

const AdminKyc = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState("pending");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [nextStay, setNextStay] = useState<Record<string, string>>({});
  const [ask, setAsk] = useState<{ r: Row; action: "approve" | "reject" } | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    let query = supabase.from("kyc_submissions").select("*").order("created_at", { ascending: false }).limit(300);
    if (filter !== "all") query = query.eq("status", filter);
    const { data, error } = await query;
    setLoadError(!!error);
    if (error) toast.error(error.message);
    const list = ((data as any) || []) as Row[];
    setRows(list);
    const ids = [...new Set(list.map((r) => r.user_id))];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name, email, phone, is_host").in("user_id", ids);
      const today = new Date().toISOString().slice(0, 10);
      const { data: bs } = await supabase.from("bookings").select("guest_id, check_in_date").in("guest_id", ids)
        .in("status", ["held", "awaiting_host", "confirmed"]).gte("check_in_date", today).order("check_in_date");
      const ns: Record<string, string> = {};
      (bs || []).forEach((b: any) => { if (!ns[b.guest_id]) ns[b.guest_id] = b.check_in_date; });
      setNextStay(ns);
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

  const decide = async (r: Row, action: "approve" | "reject", reason = "") => {
    setBusy(true);
    const { error } = await supabase.rpc("staff_kyc_action" as any, { _id: r.id, _action: action, _reason: reason || null });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(action === "approve" ? "ID approved" : "ID rejected");
    setAsk(null); setReason(""); load();
  };

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    const byStay = [...rows].sort((a, b) => (nextStay[a.user_id] || "9999").localeCompare(nextStay[b.user_id] || "9999"));
    if (!t) return byStay;
    return byStay.filter((r) => {
      const p = people[r.user_id];
      return [r.id_type, r.id_number, r.user_id, p?.name, p?.email, p?.phone].some((v) => (v || "").toLowerCase().includes(t));
    });
  }, [rows, q, people, nextStay]);

  return (
    <>
      <Seo title="KYC | Stay admin" description="Review identity submissions." noindex />
      <header className="mb-4 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold">ID checks (KYC)</h1>
          <p className="text-sm text-muted-foreground">Guest and host IDs waiting for review — soonest stay first.</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email, phone, ID type or number" className="pl-9" />
        </div>
      </header>
      <div className="w-full mb-4"><Tabs value={filter} onChange={setFilter} tabs={["pending", "approved", "rejected", "all"].map((s) => ({ value: s, label: s === "all" ? "All" : statusLabel(s) }))} /></div>

      {loadError ? <ErrorState message="This list didn't load." onRetry={() => load()} /> : loading ? (
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
                  {(() => { const ns = kycNextStep({ status: r.status, name: p?.name?.split(" ")[0] }); return <NextStep tone={ns.tone} status={ns.status} sentence={ns.sentence} />; })()}
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <Link to={`/admin/users/${r.user_id}`} className="font-bold hover:text-primary">{p?.name || "…"}</Link>
                      <p className="text-xs text-muted-foreground truncate">{[p?.email, p?.phone].filter(Boolean).join(" · ")}{p?.is_host ? " · Host" : ""}</p>
                    </div>
                    <Tag tone={toneFor(r.status)}>{statusLabel(r.status)}</Tag>
                  </div>
                  <dl className="text-xs grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                    <dt className="text-muted-foreground">ID type</dt><dd className="font-semibold">{r.id_type}</dd>
                    <dt className="text-muted-foreground">ID number</dt>
                    <dd className="font-mono">
                      {reveal[r.id] ? r.id_number : mask(r.id_number)}{" "}
                      <button onClick={() => setReveal((v) => ({ ...v, [r.id]: !v[r.id] }))} className="text-primary font-sans text-xs">{reveal[r.id] ? "Hide" : "Show"}</button>
                    </dd>
                    {r.full_name && (<><dt className="text-muted-foreground">Name on ID</dt><dd>{r.full_name}</dd></>)}
                    {r.country && (<><dt className="text-muted-foreground">Country</dt><dd>{r.country}</dd></>)}
                    <dt className="text-muted-foreground">Next stay</dt><dd>{nextStay[r.user_id] ? new Date(nextStay[r.user_id]).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "None booked"}</dd>
                    <dt className="text-muted-foreground">Submitted</dt><dd>{new Date(r.created_at).toLocaleString()}</dd>
                    {r.reviewed_at && (<><dt className="text-muted-foreground">Reviewed</dt><dd>{new Date(r.reviewed_at).toLocaleString()}</dd></>)}
                    {r.reviewer_notes && (<><dt className="text-muted-foreground">Notes</dt><dd>{r.reviewer_notes}</dd></>)}
                  </dl>
                  {r.status === "pending" && (
                    <div className="flex gap-2">
                      <button onClick={() => setAsk({ r, action: "reject" })} className="flex-1 text-xs font-semibold px-3 py-2 rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10 inline-flex items-center justify-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                      <button onClick={() => setAsk({ r, action: "approve" })} className="flex-1 text-xs font-semibold px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center gap-1">
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
      <Dialog open={!!ask} onOpenChange={(o) => { if (!o) { setAsk(null); setReason(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{ask?.action === "approve" ? "Approve this ID?" : "Reject this ID?"}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{ask?.action === "approve" ? `Check the name matches ${people[ask?.r.user_id || ""]?.name || "the account"}.` : "The guest sees this reason and can send their ID again."}</p>
          {ask?.action === "reject" && <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="e.g. Photo is blurry" />}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setAsk(null)}>Cancel</Button>
            <Button disabled={busy || (ask?.action === "reject" && !reason.trim())} variant={ask?.action === "reject" ? "destructive" : "default"} onClick={() => ask && decide(ask.r, ask.action, reason.trim())}>{ask?.action === "approve" ? "Approve" : "Reject"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminKyc;
