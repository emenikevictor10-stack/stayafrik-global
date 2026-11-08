import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, MoreHorizontal, ArrowLeft, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Seo } from "@/components/seo/Seo";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusDot, IssuePhotos, UnderlineTabs } from "@/components/support/SupportBits";
import { categoryLabel, staffStatusText, staffTone, slaState, sortQueue, queueTab, dueText, type IssueStatus } from "@/lib/support";
import { cn } from "@/lib/utils";

type Issue = {
  id: string; ref: string; booking_id: string; user_id: string; category: string; urgent: boolean; note: string;
  status: IssueStatus; owner_id: string | null; reply_due_at: string; first_reply_at: string | null; created_at: string;
  closed_at: string | null; rating: number | null; reopened_count: number; media: string[];
  bookings?: { listing_code: string | null; check_in_date: string; check_out_date: string; partner_title: string | null; partner_address: string | null; status: string; total_price: number; source: string; listings?: { title: string; address: string | null; city: string | null; host_id: string } | null } | null;
};
type Person = { full_name: string | null; email: string | null; phone: string | null; whatsapp: string | null };

const ago = (d: string) => {
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  return m < 60 ? `${m} min ago` : m < 1440 ? `${Math.floor(m / 60)} h ago` : `${Math.floor(m / 1440)} d ago`;
};
const lagos = (d: string) => new Date(d).toLocaleString("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" });

type Prompt = { action: string; title: string; desc: string; label: string; required?: boolean };

const AdminSupport = () => {
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("id");
  const [tab, setTab] = useState<"open" | "waiting" | "closed">("open");
  const [q, setQ] = useState("");
  const [issues, setIssues] = useState<Issue[] | null>(null);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [events, setEvents] = useState<any[]>([]);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [me, setMe] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [promptText, setPromptText] = useState("");
  const [, tick] = useState(0);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null)); }, []);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 30000); return () => clearInterval(t); }, []);

  const loadList = useCallback(async () => {
    const { data, error } = await supabase.from("support_issues")
      .select("*, bookings(listing_code,check_in_date,check_out_date,partner_title,partner_address,status,total_price,source,listings(title,address,city,host_id))")
      .order("created_at", { ascending: false }).limit(500);
    if (error) { toast.error("Could not load problems"); setIssues([]); return; }
    const rows = (data || []) as any as Issue[];
    setIssues(rows);
    const ids = Array.from(new Set(rows.flatMap((r) => [r.user_id, r.owner_id, r.bookings?.listings?.host_id]).filter(Boolean) as string[]));
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("user_id,full_name,email,phone,whatsapp").in("user_id", ids);
      setPeople(Object.fromEntries((ps || []).map((p: any) => [p.user_id, p])));
    }
  }, []);

  const loadEvents = useCallback(async () => {
    if (!selectedId) return setEvents([]);
    const { data } = await supabase.from("support_issue_events").select("*").eq("issue_id", selectedId).order("created_at");
    setEvents(data || []);
  }, [selectedId]);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { loadEvents(); }, [loadEvents]);
  useEffect(() => {
    const ch = supabase.channel(`admin-support-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "support_issues" }, () => loadList())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_issue_events" }, () => loadEvents())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadList, loadEvents]);

  const counts = useMemo(() => {
    const c = { open: 0, waiting: 0, closed: 0 };
    (issues || []).forEach((i) => { c[queueTab(i.status)]++; });
    return c;
  }, [issues]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const rows = (issues || []).filter((i) => queueTab(i.status) === tab).filter((i) => {
      if (!term) return true;
      const p = people[i.user_id];
      return [i.ref, i.note, i.category, p?.full_name, p?.email, p?.phone, i.bookings?.listing_code, i.bookings?.listings?.title, i.bookings?.partner_title]
        .some((v) => v?.toLowerCase().includes(term));
    });
    return tab === "closed" ? rows : sortQueue(rows);
  }, [issues, tab, q, people]);

  const sel = (issues || []).find((i) => i.id === selectedId) || null;
  const open = (id: string | null) => { const p = new URLSearchParams(params); id ? p.set("id", id) : p.delete("id"); setParams(p); setReply(""); };

  const run = async (action: string, body?: string, status?: string) => {
    if (!sel) return false;
    setBusy(true);
    const { error } = await supabase.rpc("staff_issue_action", { _issue_id: sel.id, _action: action, _body: body ?? null, _status: status ?? null } as any);
    setBusy(false);
    if (error) { toast.error(error.message); return false; }
    await Promise.all([loadList(), loadEvents()]);
    return true;
  };

  const sendReply = async () => { if (await run("reply", reply.trim())) { setReply(""); toast.success("Reply sent by email and in the app"); } };
  const confirmPrompt = async () => {
    if (!prompt) return;
    if (prompt.required && !promptText.trim()) return toast.error("Add a few words first");
    if (await run(prompt.action, promptText.trim())) { toast.success("Done"); setPrompt(null); setPromptText(""); }
  };

  const guest = sel ? people[sel.user_id] : undefined;
  const host = sel?.bookings?.listings?.host_id ? people[sel.bookings.listings.host_id] : undefined;
  const firstName = guest?.full_name?.split(" ")[0] || "The guest";

  const nextStep = (() => {
    if (!sel) return null;
    const s = slaState(sel);
    if (sel.status === "received" && !sel.owner_id)
      return { tint: true, text: `Nobody has picked this up yet. ${firstName} reported it ${ago(sel.created_at)}.`, btn: { label: "Assign to me", on: () => run("assign") } };
    if (s.needsReply)
      return { tint: true, text: `${firstName} is waiting for a reply (${dueText(s.minutesLeft)}).`, btn: { label: "Write reply", on: () => document.getElementById("staff-reply")?.focus() } };
    if (sel.status === "waiting_host")
      return { tint: false, text: "Waiting on the host. Ask the guest once it's sorted.", btn: { label: "Ask if fixed", on: () => run("ask_fixed") } };
    if (sel.status === "waiting_guest")
      return { tint: false, text: `We replied. Waiting for ${firstName}. If it's sorted, ask them to confirm.`, btn: { label: "Ask if fixed", on: () => run("ask_fixed") } };
    if (sel.status === "asked_fixed")
      return { tint: false, text: `We asked ${firstName} if it's fixed. Close it once they say yes.`, btn: { label: "Close", on: () => setPrompt({ action: "close", title: "Close this problem?", desc: "The guest is told it's closed and asked to rate our help.", label: "Close" }) } };
    return { tint: false, text: sel.rating ? `Closed. ${firstName} rated our help ${sel.rating} of 5.` : "Closed.", btn: { label: "Reopen", on: () => run("set_status", undefined, "in_progress") } };
  })();

  return (
    <div className="space-y-4">
      <Seo title="Support · Admin" description="Guest problems during stays" />
      <div>
        <h1 className="text-[24px] font-semibold">Support</h1>
        <p className="text-[13px] text-muted-foreground">Problems guests report during a stay. Urgent first, then reply due. Targets: 15 min urgent, 1 h normal.</p>
      </div>

      <div className="grid lg:grid-cols-[360px_1fr] gap-4">
        {/* Queue */}
        <section className={cn("space-y-3", sel && "hidden lg:block")}>
          <UnderlineTabs<"open" | "waiting" | "closed"> value={tab} onChange={setTab} tabs={[
            { value: "open", label: "Open", count: counts.open },
            { value: "waiting", label: "Waiting", count: counts.waiting },
            { value: "closed", label: "Closed" },
          ]} />
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ref, guest, stay, note" className="pl-9" />
          </div>
          {!issues ? (
            <div className="space-y-2">{[0, 1, 2].map((n) => <div key={n} className="h-20 rounded-xl bg-muted animate-pulse" />)}</div>
          ) : list.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center">
              <p className="text-[15px] font-semibold">{q ? "No matches" : tab === "open" ? "Nothing needs a reply" : "Nothing here"}</p>
              <p className="text-[13px] text-muted-foreground mt-1">{q ? "Try another search." : "New problems appear here as soon as guests report them."}</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {list.map((i) => {
                const s = slaState(i);
                const p = people[i.user_id];
                return (
                  <li key={i.id}>
                    <button onClick={() => open(i.id)} className={cn("w-full text-left rounded-xl border p-3 bg-card transition-colors",
                      selectedId === i.id ? "border-primary" : "border-border hover:border-foreground/30")}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[15px] font-semibold truncate">{p?.full_name || p?.email || "Guest"}</p>
                        <span className="text-[12px] text-muted-foreground shrink-0">{i.ref}</span>
                      </div>
                      <p className="text-[13px] text-muted-foreground truncate">{categoryLabel(i.category)}{i.urgent ? " · Urgent" : ""} · {i.bookings?.listings?.title || i.bookings?.partner_title || "Stay"}</p>
                      <div className="flex items-center justify-between mt-1">
                        <StatusDot tone={staffTone(i)}>{staffStatusText[i.status]}</StatusDot>
                        <span className={cn("text-[12px]", s.overdue ? "text-destructive" : "text-muted-foreground")}>
                          {s.needsReply ? dueText(s.minutesLeft) : ago(i.created_at)}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Detail */}
        <section className={cn(!sel && "hidden lg:block")}>
          {!sel ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-[15px] text-muted-foreground">Pick a problem from the list.</div>
          ) : (
            <div className="space-y-4">
              <button onClick={() => open(null)} className="lg:hidden inline-flex items-center gap-1 text-[13px] text-muted-foreground"><ArrowLeft className="w-4 h-4" /> Back</button>
              <header className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[12px] text-muted-foreground">{sel.ref}</p>
                  <h2 className="text-[20px] font-semibold">{categoryLabel(sel.category)}{sel.urgent ? " · Urgent" : ""}</h2>
                  <p className="text-[13px] text-muted-foreground">{guest?.full_name || "Guest"} · {sel.bookings?.listings?.title || sel.bookings?.partner_title} · reported {lagos(sel.created_at)}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="outline" size="icon" aria-label="More actions"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {sel.owner_id !== me && <DropdownMenuItem onClick={() => run("assign")}>Assign to me</DropdownMenuItem>}
                    <DropdownMenuItem onClick={() => setPrompt({ action: "note", title: "Internal note", desc: "Only staff see this.", label: "Save note", required: true })}>Add internal note</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPrompt({ action: "log_host_contact", title: "Log host contact", desc: "What did the host say or agree to? Moves the problem to Waiting on host.", label: "Save", required: true })}>Log host contact</DropdownMenuItem>
                    {sel.status !== "closed" && <DropdownMenuItem onClick={() => run("ask_fixed")}>Ask "Is it fixed?"</DropdownMenuItem>}
                    {!sel.urgent && <DropdownMenuItem onClick={() => run("escalate")}>Mark urgent</DropdownMenuItem>}
                    <DropdownMenuSeparator />
                    {sel.status !== "closed"
                      ? <DropdownMenuItem onClick={() => setPrompt({ action: "close", title: "Close this problem?", desc: "Optional: a short closing note the guest will see.", label: "Close" })}>Close</DropdownMenuItem>
                      : <DropdownMenuItem onClick={() => run("set_status", undefined, "in_progress")}>Reopen</DropdownMenuItem>}
                  </DropdownMenuContent>
                </DropdownMenu>
              </header>

              {nextStep && (
                <div className={cn("rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3", nextStep.tint ? "border-warning/40 bg-warning/10" : "border-border bg-card")}>
                  <div className="flex-1 space-y-1">
                    <StatusDot tone={staffTone(sel)}>{staffStatusText[sel.status]}</StatusDot>
                    <p className="text-[15px]">{nextStep.text}</p>
                  </div>
                  <Button disabled={busy} onClick={nextStep.btn.on}>{nextStep.btn.label}</Button>
                </div>
              )}

              <div className="grid xl:grid-cols-[1fr_280px] gap-4">
                <div className="space-y-3">
                  <h3 className="text-[15px] font-semibold">Thread</h3>
                  <div className="space-y-2">
                    {events.map((e) => {
                      if (e.kind === "status") return <p key={e.id} className="text-[12px] text-muted-foreground text-center">{e.body} · {lagos(e.created_at)}</p>;
                      const note = e.kind === "note";
                      const guestMsg = e.author_type === "guest";
                      const who = guestMsg ? (guest?.full_name || "Guest") : (people[e.author_id]?.full_name || "Staff");
                      return (
                        <div key={e.id} className={cn("rounded-xl border p-3", note ? "border-dashed border-border bg-muted/40" : guestMsg ? "border-border bg-card" : "border-primary/30 bg-primary/5")}>
                          <p className="text-[12px] text-muted-foreground">{note ? "Internal note · " : ""}{who} · {lagos(e.created_at)}</p>
                          {e.body && <p className="text-[15px] whitespace-pre-wrap mt-0.5">{e.body}</p>}
                          <IssuePhotos paths={e.media || []} />
                        </div>
                      );
                    })}
                  </div>
                  {sel.status !== "closed" && (
                    <div className="space-y-2">
                      <Textarea id="staff-reply" value={reply} onChange={(e) => setReply(e.target.value)} rows={3} placeholder={`Reply to ${firstName} (sent by email and in the app)`} />
                      <div className="flex justify-end"><Button disabled={busy || !reply.trim()} onClick={sendReply}>{busy && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Send reply</Button></div>
                    </div>
                  )}
                </div>

                <aside className="space-y-4">
                  <dl className="rounded-xl border border-border p-3 space-y-2 text-[13px]">
                    <h3 className="text-[15px] font-semibold">Guest</h3>
                    <Row k="Name" v={guest?.full_name} />
                    <Row k="Email" v={guest?.email} />
                    <Row k="Phone" v={guest?.phone || guest?.whatsapp} />
                    <Link to={`/admin/users/${sel.user_id}`} className="text-primary font-semibold">Open user</Link>
                  </dl>
                  <dl className="rounded-xl border border-border p-3 space-y-2 text-[13px]">
                    <h3 className="text-[15px] font-semibold">Stay</h3>
                    <Row k="Listing ID" v={sel.bookings?.listing_code} />
                    <Row k="Dates" v={sel.bookings ? `${sel.bookings.check_in_date} → ${sel.bookings.check_out_date}` : null} />
                    <Row k="Booking" v={sel.bookings?.status} />
                    <Row k="Address" v={sel.bookings?.listings ? [sel.bookings.listings.address, sel.bookings.listings.city].filter(Boolean).join(", ") : sel.bookings?.partner_address} />
                    <Row k="Source" v={sel.bookings?.source === "rayprop" ? "Partner (RayProp)" : "StayGlobal"} />
                    {host && <><Row k="Host" v={host.full_name} /><Row k="Host phone" v={host.whatsapp || host.phone} /></>}
                    <Link to={`/admin/bookings?q=${encodeURIComponent(sel.bookings?.listing_code || sel.booking_id)}`} className="text-primary font-semibold">Open booking</Link>
                  </dl>
                  <dl className="rounded-xl border border-border p-3 space-y-2 text-[13px]">
                    <h3 className="text-[15px] font-semibold">Timing</h3>
                    <Row k="Owner" v={sel.owner_id ? (sel.owner_id === me ? "You" : people[sel.owner_id]?.full_name || "Staff") : "Nobody yet"} />
                    <Row k="Reply due" v={lagos(sel.reply_due_at)} />
                    <Row k="First reply" v={sel.first_reply_at ? lagos(sel.first_reply_at) : "Not yet"} />
                    <Row k="Reopened" v={String(sel.reopened_count)} />
                    {sel.closed_at && <Row k="Closed" v={lagos(sel.closed_at)} />}
                  </dl>
                </aside>
              </div>
            </div>
          )}
        </section>
      </div>

      <Dialog open={!!prompt} onOpenChange={(o) => { if (!o) { setPrompt(null); setPromptText(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{prompt?.title}</DialogTitle><DialogDescription>{prompt?.desc}</DialogDescription></DialogHeader>
          <Textarea value={promptText} onChange={(e) => setPromptText(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrompt(null)}>Cancel</Button>
            <Button disabled={busy} onClick={confirmPrompt}>{prompt?.label}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Row = ({ k, v }: { k: string; v?: string | null }) => (
  <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{k}</dt><dd className="text-right break-words">{v || "—"}</dd></div>
);

export default AdminSupport;
