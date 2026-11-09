import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, ErrorState, ListSkeleton, Notice, Tabs, Tag } from "@/ui/kit";

const naira = (n: number) => "₦" + Math.round(Number(n || 0)).toLocaleString();
const csv = (name: string, rows: (string | number | null)[][]) => {
  const body = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([body], { type: "text/csv" }));
  a.download = name; a.click();
};
const input = "h-11 rounded-lg border border-border bg-background px-3 text-[13px]";
const btn = "min-h-11 px-3 rounded-lg border border-border text-[13px] font-semibold";

type Pay = { id: string; created_at: string; paid_at: string | null; status: string; source: string; total_price: number; payment_reference: string | null; listing_code: string | null; partner_title: string | null; attention_reason: string | null; is_split: boolean; listings: { title: string } | null };

/** /admin/payments — every guest payment with problem flags and CSV. */
export const AdminPayments = () => {
  const [rows, setRows] = useState<Pay[] | null>(null);
  const [err, setErr] = useState(false);
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const load = useCallback(async () => {
    setErr(false);
    const { data, error } = await supabase.from("bookings")
      .select("id,created_at,paid_at,status,source,total_price,payment_reference,listing_code,partner_title,attention_reason,is_split,listings(title)")
      .or("paid_at.not.is.null,status.in.(confirmed,released,completed,awaiting_host,needs_attention,refunded,processing)")
      .order("created_at", { ascending: false }).limit(500);
    if (error) return setErr(true);
    setRows(data as unknown as Pay[]);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const shown = useMemo(() => (rows || []).filter((r) =>
    (tab === "all" || (tab === "flagged" ? r.status === "needs_attention" : r.status === "refunded")) &&
    (!q || [r.payment_reference, r.listing_code, r.listings?.title, r.partner_title].join(" ").toLowerCase().includes(q.toLowerCase()))), [rows, tab, q]);
  const flagged = (rows || []).filter((r) => r.status === "needs_attention").length;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Payments</h1>
      <div className="flex flex-wrap gap-2 items-center">
        <Tabs value={tab} onChange={setTab} tabs={[{ value: "all", label: "All" }, { value: "flagged", label: `Needs attention (${flagged})` }, { value: "refunded", label: "Refunded" }]} />
        <input aria-label="Search payments" placeholder="Reference, listing ID, stay" value={q} onChange={(e) => setQ(e.target.value)} className={input} />
        <button type="button" className={btn} onClick={() => csv("payments.csv", [["Date", "Reference", "Stay", "Listing ID", "Source", "Status", "Amount NGN", "Split", "Note"],
          ...shown.map((r) => [r.paid_at || r.created_at, r.payment_reference, r.listings?.title || r.partner_title, r.listing_code, r.source, r.status, r.total_price, r.is_split ? "yes" : "", r.attention_reason])])}>Download CSV</button>
      </div>
      {err ? <ErrorState onRetry={load} /> : rows === null ? <ListSkeleton /> : !shown.length ? <EmptyState title="No payments yet" /> : (
        <div className="rounded-xl border border-border divide-y divide-border">
          {shown.map((r) => (
            <div key={r.id} className="p-3 grid gap-1 sm:grid-cols-[1fr_auto_auto] sm:items-center text-[13px]">
              <div className="min-w-0">
                <p className="font-semibold truncate">{r.listings?.title || r.partner_title || "Stay"} {r.listing_code && <span className="text-muted-foreground font-normal">· {r.listing_code}</span>}</p>
                <p className="text-muted-foreground font-mono break-all">{r.payment_reference} · {new Date(r.paid_at || r.created_at).toLocaleString("en-NG")}{r.is_split ? " · split" : ""}</p>
                {r.attention_reason && <p className="text-destructive">{r.attention_reason}</p>}
              </div>
              <Tag tone={r.status === "needs_attention" ? "broken" : r.status === "refunded" ? "fact" : "done"}>{r.status.replace(/_/g, " ")}</Tag>
              <p className="font-semibold sm:text-right">{naira(r.total_price)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

type Mail = { id: string; template_name: string; recipient_email: string; status: string; error_message: string | null; created_at: string };

/** /admin/messages — email send log. */
export const AdminMessages = () => {
  const [rows, setRows] = useState<Mail[] | null>(null);
  const [err, setErr] = useState(false);
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const load = useCallback(async () => {
    setErr(false);
    const { data, error } = await supabase.from("email_send_log").select("id,template_name,recipient_email,status,error_message,created_at").order("created_at", { ascending: false }).limit(300);
    if (error) return setErr(true);
    setRows(data as Mail[]);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const shown = (rows || []).filter((r) => (tab === "all" || (tab === "failed" ? ["failed", "dlq", "bounced"].includes(r.status) : r.status === tab))
    && (!q || (r.recipient_email + r.template_name).toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Messages</h1>
      <div className="flex flex-wrap gap-2 items-center">
        <Tabs value={tab} onChange={setTab} tabs={[{ value: "all", label: "All" }, { value: "sent", label: "Sent" }, { value: "failed", label: "Failed" }, { value: "suppressed", label: "Blocked" }]} />
        <input aria-label="Search messages" placeholder="Email or type" value={q} onChange={(e) => setQ(e.target.value)} className={input} />
      </div>
      <p className="text-xs text-muted-foreground">Failed emails are retried automatically. Blocked means the person unsubscribed or their address bounced.</p>
      {err ? <ErrorState onRetry={load} /> : rows === null ? <ListSkeleton /> : !shown.length ? <EmptyState title="No emails" /> : (
        <div className="rounded-xl border border-border divide-y divide-border text-[13px]">
          {shown.map((r) => (
            <div key={r.id} className="p-3 flex flex-wrap justify-between gap-2">
              <div className="min-w-0"><p className="font-semibold break-all">{r.recipient_email}</p><p className="text-muted-foreground">{r.template_name.replace(/[_-]/g, " ")} · {new Date(r.created_at).toLocaleString("en-NG")}</p>{r.error_message && <p className="text-destructive">{r.error_message}</p>}</div>
              <Tag tone={r.status === "sent" ? "done" : ["failed", "dlq", "bounced"].includes(r.status) ? "broken" : "fact"}>{r.status}</Tag>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

type Health = { jobs: { name: string; schedule: string; active: boolean; last_run: string | null; last_status: string | null; fails_24h: number }[]; emails_failed_24h: number; emails_sent_24h: number; needs_attention: number; refunds_failed: number; partner: { blocked_until: string | null; blocked_reason: string | null; last_refresh: string | null } | null };
const JOB_NAMES: Record<string, string> = {
  "booking-lifecycle-hourly": "Bookings: holds, releases, reminders (every 5 min)", "booking-requests-refunds": "Refunds for declined requests and unfinished splits",
  "expire-reservations": "Viewing holds", "ical-sync-hourly": "Calendar imports", "queue-review-prompts": "Review prompts", "refresh-location-counts": "Place counts",
};

/** /admin/health — scheduled jobs, email delivery, stuck money, partner link. */
export const AdminHealth = () => {
  const [h, setH] = useState<Health | null>(null);
  const [err, setErr] = useState(false);
  const load = useCallback(async () => {
    setErr(false);
    const { data, error } = await supabase.rpc("admin_health");
    if (error) return setErr(true);
    setH(data as unknown as Health);
  }, []);
  useEffect(() => { void load(); }, [load]);
  if (err) return <ErrorState onRetry={load} />;
  if (!h) return <ListSkeleton />;
  const blocked = h.partner?.blocked_until && new Date(h.partner.blocked_until) > new Date();
  const Stat = ({ label, value, bad, to }: { label: string; value: number | string; bad?: boolean; to?: string }) => (
    <div className="rounded-xl border border-border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className={`text-xl font-semibold ${bad ? "text-destructive" : ""}`}>{value}</p>{to && <Link to={to} className="text-xs underline">Open</Link>}</div>
  );
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Health</h1>
      <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
        <Stat label="Bookings needing attention" value={h.needs_attention} bad={h.needs_attention > 0} to="/admin/payments" />
        <Stat label="Refunds that failed" value={h.refunds_failed} bad={h.refunds_failed > 0} to="/admin/bookings" />
        <Stat label="Emails sent (24h)" value={h.emails_sent_24h} to="/admin/messages" />
        <Stat label="Emails failed (24h)" value={h.emails_failed_24h} bad={h.emails_failed_24h > 0} to="/admin/messages" />
      </div>
      {blocked ? <Notice tone="danger">Partner stays are paused until {new Date(h.partner!.blocked_until!).toLocaleString("en-NG")}: {h.partner!.blocked_reason}</Notice>
        : <Notice>Partner stays are connected. Last full catalogue refresh: {h.partner?.last_refresh ? new Date(h.partner.last_refresh).toLocaleString("en-NG") : "not yet"}.</Notice>}
      <p className="text-xs text-muted-foreground">The partner wallet balance isn't shown here — the partner doesn't offer a way to read it yet.</p>
      <section>
        <h2 className="text-[15px] font-semibold mb-2">Scheduled jobs</h2>
        <div className="rounded-xl border border-border divide-y divide-border text-[13px]">
          {h.jobs.map((j) => (
            <div key={j.name} className="p-3 flex flex-wrap justify-between gap-2">
              <div><p className="font-semibold">{JOB_NAMES[j.name] || j.name}</p><p className="text-muted-foreground">Last run {j.last_run ? new Date(j.last_run).toLocaleString("en-NG") : "not in the last day"}{j.fails_24h ? ` · ${j.fails_24h} failed in 24h` : ""}</p></div>
              <Tag tone={!j.active ? "fact" : j.last_status === "failed" ? "broken" : "done"}>{!j.active ? "paused" : j.last_status || "waiting"}</Tag>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export { AdminTeam } from "./AdminTeam";
