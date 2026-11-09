import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { statusLabel } from "@/lib/status-tone";

type Ev = { id: string; type: string; actor: string; data: Record<string, any>; created_at: string };
type Money = { subtotal_kobo?: number | null; fee_kobo?: number | null; markup_kobo?: number | null; host_payout_kobo?: number | null };

const naira = (kobo: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(kobo / 100);

const describe = (e: Ev) => {
  if (e.type.startsWith("status:")) {
    const to = statusLabel(e.type.slice(7));
    return e.data?.from ? `${statusLabel(e.data.from)} → ${to}` : `Created as ${to.toLowerCase()}`;
  }
  if (e.type === "payment_received") return `Payment received${e.data?.amount_kobo ? ` · ${naira(Number(e.data.amount_kobo))}` : ""}`;
  if (e.type === "rayprop_reply") return `RayProp replied: ${e.data?.status ?? "unknown"}${e.data?.reason ? ` (${e.data.reason})` : ""}`;
  if (e.type === "note") return e.data?.body ?? "";
  return statusLabel(e.type);
};

/** Booking timeline + money split, loaded on demand. Staff can add notes (never shown to guests). */
export const BookingTimeline = ({ bookingId, money }: { bookingId: string; money?: Money }) => {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<Ev[] | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [shares, setShares] = useState<any[]>([]);

  const load = async () => {
    const { data, error } = await supabase.from("booking_events").select("id,type,actor,data,created_at")
      .eq("booking_id", bookingId).order("created_at", { ascending: true });
    if (error) return toast.error("Timeline didn't load");
    setEvents((data as Ev[]) || []);
    const { data: sh } = await supabase.from("payment_shares").select("id,share_no,amount_kobo,status,label,name,phone,email,pay_method,paid_at,refunded_at,token")
      .eq("booking_id", bookingId).order("share_no");
    setShares(sh || []);
  };
  const toggle = () => { setOpen(!open); if (!events) load(); };
  const addNote = async () => {
    if (!note.trim()) return;
    setSaving(true);
    const { error } = await supabase.rpc("staff_booking_action", { _booking_id: bookingId, _action: "note", _note: note.trim() });
    setSaving(false);
    if (error) return toast.error(error.message);
    setNote("");
    load();
  };

  const hasMoney = money && (money.subtotal_kobo || money.markup_kobo);

  return (
    <div className="border-t border-border pt-2">
      <button onClick={toggle} className="text-xs font-semibold text-primary min-h-11" aria-expanded={open}>
        {open ? "Hide timeline" : "Show timeline"}
      </button>
      {open && (
        <div className="space-y-3 pb-2">
          {shares.length > 0 && (
            <div className="rounded-lg border border-border p-2 text-xs space-y-1">
              <p className="font-semibold">Split payment · {shares.filter((x) => x.status === "paid").length} of {shares.filter((x) => x.status !== "void").length} paid</p>
              {shares.map((x) => (
                <div key={x.id} className="flex flex-wrap justify-between gap-2">
                  <span>{x.share_no === 1 ? "Organiser" : x.name || x.label || `Person ${x.share_no}`}{x.email ? ` · ${x.email}` : ""}{x.phone ? ` · ${x.phone}` : ""}</span>
                  <span>{naira(Number(x.amount_kobo))} · {x.pay_method === "bank_transfer" ? "Transfer" : x.pay_method === "card" ? "Card" : "—"} · <b>{x.status === "void" ? "Removed" : statusLabel(x.status)}</b>{x.status === "pending" ? " (link open)" : ""}</span>
                </div>
              ))}
            </div>
          )}
          {hasMoney && (
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {money!.subtotal_kobo != null && <div><dt className="text-muted-foreground">Nights</dt><dd className="font-semibold">{naira(money!.subtotal_kobo)}</dd></div>}
              {money!.fee_kobo != null && <div><dt className="text-muted-foreground">Our fee</dt><dd className="font-semibold">{naira(money!.fee_kobo)}</dd></div>}
              {money!.markup_kobo != null && <div><dt className="text-muted-foreground">Our markup</dt><dd className="font-semibold">{naira(money!.markup_kobo)}</dd></div>}
              {money!.host_payout_kobo != null && <div><dt className="text-muted-foreground">Host gets</dt><dd className="font-semibold">{naira(money!.host_payout_kobo)}</dd></div>}
            </dl>
          )}
          {events === null ? <p className="text-xs text-muted-foreground">Loading…</p> : events.length === 0 ? (
            <p className="text-xs text-muted-foreground">No events recorded yet.</p>
          ) : (
            <ol className="space-y-1.5">
              {events.map((e) => (
                <li key={e.id} className="text-xs flex gap-2">
                  <span className="text-muted-foreground shrink-0 w-32">{new Date(e.created_at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  <span className="text-muted-foreground shrink-0 w-14 capitalize">{e.actor}</span>
                  <span className={e.type === "note" ? "italic" : "font-medium"}>{describe(e)}</span>
                </li>
              ))}
            </ol>
          )}
          <div className="flex gap-2">
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} placeholder="Add a staff note (guests don't see it)"
              className="flex-1 h-9 rounded-lg bg-secondary border border-border px-2 text-xs" />
            <button onClick={addNote} disabled={saving || !note.trim()} className="text-xs font-semibold px-3 rounded-lg border border-border disabled:opacity-50">Add note</button>
          </div>
        </div>
      )}
    </div>
  );
};
