import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Search, MoreVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Seo } from "@/components/seo/Seo";
import { Input } from "@/components/ui/input";
import { ErrorState, Tabs, Tag } from "@/ui/kit";
import { toneFor, statusLabel } from "@/lib/status-tone";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type Host = {
  id: string; name: string; email: string | null; phone: string | null; joined: string;
  status: string; reason: string | null; kyc: string | null;
  bank: { label: string; holder: string | null; verified: boolean; accountName: string | null } | null;
  live: number; total: number; bookings: number; held: number; due: number; paid: number;
};

const money = (n: number) => "₦" + Math.round(n).toLocaleString();

const AdminHosts = () => {
  const [params] = useSearchParams();
  const [rows, setRows] = useState<Host[]>([]);
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState(params.get("q") || "");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: listings, error } = await supabase.from("listings").select("host_id, is_available, verified").limit(5000);
    const { data: profs } = await supabase.from("profiles").select("user_id, full_name, email, phone, created_at, is_host").limit(5000);
    if (error) { setErr(true); setLoading(false); return; }
    const hostIds = new Set<string>([...(listings || []).map((l) => l.host_id), ...(profs || []).filter((p) => p.is_host).map((p) => p.user_id)]);
    const ids = [...hostIds];
    const [{ data: pms }, { data: hs }, { data: kyc }, { data: bks }, { data: pays }] = await Promise.all([
      supabase.from("payment_methods").select("user_id, brand, last4, holder_name, account_number, verified_at, account_name").in("user_id", ids).eq("is_default", true),
      supabase.from("host_status").select("host_id, status, reason").in("host_id", ids),
      supabase.from("kyc_submissions").select("user_id, status, created_at").in("user_id", ids).order("created_at", { ascending: false }),
      supabase.from("bookings").select("host_id, status, host_payout_kobo").in("host_id", ids).limit(5000),
      supabase.from("payouts").select("host_id, status, amount").in("host_id", ids).limit(5000),
    ]);
    const pm = new Map((pms || []).map((p: any) => [p.user_id, p]));
    const st = new Map((hs || []).map((h: any) => [h.host_id, h]));
    const ky = new Map<string, string>();
    (kyc || []).forEach((k: any) => { if (!ky.has(k.user_id)) ky.set(k.user_id, k.status); });
    const prof = new Map((profs || []).map((p) => [p.user_id, p]));
    setRows(ids.map((id) => {
      const p: any = prof.get(id) || {};
      const b: any = pm.get(id);
      const mine = (listings || []).filter((l) => l.host_id === id);
      const bk = (bks || []).filter((x: any) => x.host_id === id);
      const py = (pays || []).filter((x: any) => x.host_id === id);
      const sum = (a: any[]) => a.reduce((s, x) => s + Number(x.amount), 0);
      return {
        id, name: p.full_name || p.email || "Host", email: p.email ?? null, phone: p.phone ?? null, joined: p.created_at,
        status: (st.get(id) as any)?.status || "active", reason: (st.get(id) as any)?.reason || null, kyc: ky.get(id) || null,
        bank: b?.account_number ? { label: `${b.brand} ••${b.last4}`, holder: b.holder_name, verified: !!b.verified_at, accountName: b.account_name } : null,
        live: mine.filter((l) => l.verified && l.is_available).length, total: mine.length,
        bookings: bk.filter((x: any) => !["held", "expired", "cancelled", "declined"].includes(x.status)).length,
        held: bk.filter((x: any) => ["confirmed", "awaiting_host"].includes(x.status)).reduce((s: number, x: any) => s + Number(x.host_payout_kobo || 0) / 100, 0),
        due: sum(py.filter((x: any) => ["pending", "processing", "on_hold"].includes(x.status))),
        paid: sum(py.filter((x: any) => x.status === "paid")),
      };
    }).sort((a, b) => (b.joined || "").localeCompare(a.joined || "")));
    setErr(false);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const act = async (h: Host, action: string) => {
    let reason: string | null = null;
    if (action === "suspend") {
      reason = window.prompt(`Suspend ${h.name}? Their stays are hidden and no new bookings can be made. Existing bookings continue.\nReason (required):`);
      if (!reason?.trim()) return;
    } else if (action === "verify_bank") {
      reason = window.prompt(`Confirm ${h.name}'s bank account ${h.bank?.label}.\nAccount name as shown by the bank:`, h.bank?.holder || "");
      if (reason === null) return;
    } else if (!confirm(`${action === "unsuspend" ? "Lift suspension for" : action === "approve" ? "Approve" : "Clear bank check for"} ${h.name}?`)) return;
    const { error } = await supabase.rpc("staff_host_action" as any, { _host_id: h.id, _action: action, _reason: reason });
    if (error) return toast.error(error.message);
    toast.success("Saved");
    load();
  };

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((h) => {
      if (tab === "bank" && !(h.bank && !h.bank.verified)) return false;
      if (tab === "suspended" && h.status !== "suspended") return false;
      return !t || [h.name, h.email, h.phone, h.id].some((v) => (v || "").toLowerCase().includes(t));
    });
  }, [rows, q, tab]);

  return (
    <>
      <Seo title="Hosts | Stay admin" description="Manage hosts." noindex />
      <header className="mb-4 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold">Hosts</h1>
          <p className="text-sm text-muted-foreground">{rows.length} hosts · {rows.filter((h) => h.bank && !h.bank.verified).length} bank accounts to check</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email, phone…" className="pl-9" />
        </div>
      </header>
      <div className="w-full mb-4"><Tabs value={tab} onChange={setTab} tabs={[{ value: "all", label: "All" }, { value: "bank", label: "Needs bank check" }, { value: "suspended", label: "Suspended" }]} /></div>
      {err ? <ErrorState message="This list didn't load." onRetry={load} /> : loading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-16 rounded-xl bg-secondary animate-pulse" />)}</div>
      ) : shown.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">No hosts here.</div>
      ) : (
        <div className="rounded-2xl border border-border bg-card divide-y divide-border">
          {shown.map((h) => (
            <div key={h.id} className="p-3 grid grid-cols-1 md:grid-cols-[1.6fr_1.2fr_0.8fr_1.4fr_auto] gap-2 md:items-center text-sm">
              <div className="min-w-0">
                <Link to={`/admin/users/${h.id}`} className="font-bold hover:text-primary truncate block">{h.name}</Link>
                <p className="text-xs text-muted-foreground truncate">{[h.email, h.phone].filter(Boolean).join(" · ")}</p>
                <p className="text-xs text-muted-foreground">Joined {h.joined ? new Date(h.joined).toLocaleDateString() : "—"} · ID {h.kyc ? statusLabel(h.kyc).toLowerCase() : "not sent"}</p>
              </div>
              <div className="text-xs">
                {h.bank ? (<>
                  <p className="font-semibold">{h.bank.label}</p>
                  <Tag tone={h.bank.verified ? "done" : "act"}>{h.bank.verified ? `Checked${h.bank.accountName ? ` · ${h.bank.accountName}` : ""}` : "Not checked"}</Tag>
                </>) : <p className="text-muted-foreground">No bank account</p>}
              </div>
              <div className="text-xs"><p className="font-semibold">{h.live}/{h.total} live</p><p className="text-muted-foreground">{h.bookings} bookings</p></div>
              <div className="text-xs grid grid-cols-3 gap-1">
                <div><p className="text-muted-foreground">Held</p><p className="font-semibold">{money(h.held)}</p></div>
                <div><p className="text-muted-foreground">Due</p><p className="font-semibold">{money(h.due)}</p></div>
                <div><p className="text-muted-foreground">Paid</p><p className="font-semibold">{money(h.paid)}</p></div>
              </div>
              <div className="flex items-center gap-2 justify-between md:justify-end">
                <Tag tone={toneFor(h.status)}>{statusLabel(h.status)}</Tag>
                <DropdownMenu>
                  <DropdownMenuTrigger aria-label={`Actions for ${h.name}`} className="p-2 rounded-lg hover:bg-secondary min-h-11 min-w-11 grid place-items-center"><MoreVertical className="w-4 h-4" /></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild><Link to={`/admin/users/${h.id}`}>View details</Link></DropdownMenuItem>
                    {h.status === "active" && <DropdownMenuItem onClick={() => act(h, "approve")}>Approve host</DropdownMenuItem>}
                    {h.bank && !h.bank.verified && <DropdownMenuItem onClick={() => act(h, "verify_bank")}>Mark bank checked</DropdownMenuItem>}
                    {h.bank?.verified && <DropdownMenuItem onClick={() => act(h, "unverify_bank")}>Clear bank check</DropdownMenuItem>}
                    {h.status === "suspended"
                      ? <DropdownMenuItem onClick={() => act(h, "unsuspend")}>Lift suspension</DropdownMenuItem>
                      : <DropdownMenuItem onClick={() => act(h, "suspend")} className="text-destructive">Suspend…</DropdownMenuItem>}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {h.reason && <p className="md:col-span-5 text-xs text-muted-foreground">Reason: {h.reason}</p>}
            </div>
          ))}
        </div>
      )}
    </>
  );
};
export default AdminHosts;
