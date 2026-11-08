import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Star, ImagePlus } from "lucide-react";
import { TopBar } from "@/components/shell/TopBar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { categoryLabel, guestStatusText, type IssueStatus, type DotTone } from "@/lib/support";
import { StatusDot, IssuePhotos, uploadIssuePhotos } from "@/components/support/SupportBits";
import { cn } from "@/lib/utils";

const guestTone = (s: string): DotTone => (s === "asked_fixed" ? "act" : s === "closed" ? "done" : "fact");

const IssueThread = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [issue, setIssue] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const [{ data: i }, { data: ev }] = await Promise.all([
      supabase.from("support_issues").select("*, bookings(partner_title, listing_code, listings(title))").eq("id", id).maybeSingle(),
      supabase.from("support_issue_events").select("*").eq("issue_id", id).order("created_at"),
    ]);
    setIssue(i); setEvents(ev || []); setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!id) return;
    const ch = supabase.channel(`issue-${id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "support_issue_events", filter: `issue_id=eq.${id}` }, load)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "support_issues", filter: `id=eq.${id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, load]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [events.length]);

  const act = async (action: string, extra: Record<string, unknown> = {}) => {
    setBusy(true);
    const { error } = await supabase.rpc("guest_issue_action", { _issue_id: id!, _action: action, ...extra } as any);
    setBusy(false);
    if (error) { toast.error(error.message); return false; }
    load();
    return true;
  };

  const send = async () => {
    if (!user || (!reply.trim() && !files.length)) return;
    setBusy(true);
    try {
      const media = files.length ? await uploadIssuePhotos(user.id, files) : [];
      const { error } = await supabase.rpc("guest_issue_action", { _issue_id: id!, _action: "reply", _body: reply.trim(), _media: media });
      if (error) throw new Error(error.message);
      setReply(""); setFiles([]); load();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  if (loading) return (<><TopBar title="Problem" /><main className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></main></>);
  if (!issue) return (<><TopBar title="Problem" /><main className="px-4 py-10 text-center text-[15px]">We couldn't find that problem. <Link to="/issues" className="text-primary font-semibold">See your problems</Link></main></>);

  const st = issue.status as IssueStatus;
  const stay = issue.bookings?.listings?.title || issue.bookings?.partner_title || "Your stay";
  const sentence =
    st === "asked_fixed" ? "We think it's sorted. Is it fixed?"
    : st === "closed" ? "This problem is closed."
    : st === "waiting_guest" ? "We replied below. Answer here if you need more help."
    : st === "waiting_host" ? "We've contacted the host and will update you."
    : issue.urgent ? "Marked urgent. Someone will reply within 15 minutes."
    : "Someone will reply within an hour.";

  return (
    <>
      <TopBar title={`Problem ${issue.ref}`} />
      <main className="px-4 pt-4 pb-10 max-w-xl mx-auto space-y-4">
        <div>
          <p className="text-[15px] font-semibold">{categoryLabel(issue.category)} · {stay}</p>
          <p className="text-[13px] text-muted-foreground">Reported {new Date(issue.created_at).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}{issue.urgent ? " · Urgent" : ""}</p>
        </div>

        <div className={cn("rounded-xl border p-3 space-y-3", st === "asked_fixed" ? "border-warning/40 bg-warning/10" : "border-border")}>
          <StatusDot tone={guestTone(st)}>{guestStatusText[st]}</StatusDot>
          <p className="text-[15px]">{sentence}</p>
          {st === "asked_fixed" && (
            <div className="flex gap-2">
              <button disabled={busy} onClick={() => act("answer_fixed", { _value: 1 })} className="flex-1 h-11 rounded-lg bg-primary text-primary-foreground text-[15px] font-semibold disabled:opacity-50">Yes, it's fixed</button>
              <button disabled={busy} onClick={() => act("answer_fixed", { _value: 0 })} className="flex-1 h-11 rounded-lg border border-border text-[15px] font-semibold disabled:opacity-50">No, not yet</button>
            </div>
          )}
          {st === "closed" && (
            issue.rating ? <p className="text-[13px] text-muted-foreground">You rated our help {issue.rating} of 5. Thank you.</p> : (
              <div>
                <p className="text-[13px] text-muted-foreground mb-1">How did we do?</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} aria-label={`${n} stars`} disabled={busy} onClick={() => act("rate", { _value: n }).then((ok) => ok && toast.success("Thanks for rating"))}>
                      <Star className="w-7 h-7 text-muted-foreground/50 hover:fill-primary hover:text-primary" />
                    </button>
                  ))}
                </div>
              </div>
            )
          )}
        </div>

        <section className="space-y-3">
          {events.map((e) => {
            const mine = e.author_type === "guest";
            if (e.kind === "status") return <p key={e.id} className="text-center text-[12px] text-muted-foreground">{e.body} · {new Date(e.created_at).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit" })}</p>;
            return (
              <div key={e.id} className={cn("max-w-[85%] rounded-xl p-3", mine ? "ml-auto bg-primary/10" : "bg-card border border-border")}>
                <p className="text-[12px] text-muted-foreground mb-0.5">{mine ? "You" : "StayGlobal"} · {new Date(e.created_at).toLocaleString("en-NG", { timeZone: "Africa/Lagos", dateStyle: "short", timeStyle: "short" })}</p>
                {e.body && <p className="text-[15px] whitespace-pre-wrap">{e.body}</p>}
                <IssuePhotos paths={e.media || []} />
              </div>
            );
          })}
          <div ref={endRef} />
        </section>

        {st !== "closed" && (
          <section className="space-y-2">
            <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} maxLength={2000} placeholder="Write a message"
              className="w-full rounded-lg bg-background border border-border p-3 text-[15px]" />
            <div className="flex items-center gap-2">
              <label className="h-11 px-3 rounded-lg border border-border flex items-center gap-2 text-[13px] cursor-pointer">
                <ImagePlus className="w-4 h-4" /> {files.length ? `${files.length} photo${files.length > 1 ? "s" : ""}` : "Add photo"}
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { setFiles(Array.from(e.target.files || []).slice(0, 5)); e.target.value = ""; }} />
              </label>
              <button onClick={send} disabled={busy || (!reply.trim() && !files.length)} className="flex-1 h-11 rounded-lg bg-primary text-primary-foreground text-[15px] font-semibold disabled:opacity-50">Send</button>
            </div>
          </section>
        )}
      </main>
    </>
  );
};

export default IssueThread;
