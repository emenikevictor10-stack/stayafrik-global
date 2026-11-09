import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button, EmptyState, ErrorState, ListSkeleton, Tabs, Tag } from "@/ui/kit";
import { toast } from "sonner";

const fmtK = (k: number) => "₦" + Math.round(Number(k || 0) / 100).toLocaleString();
const ask = (q: string) => window.prompt(q) ?? null;

type Order = { id: string; booking_id: string; addon_name: string; qty: number; amount_kobo: number; status: string; note: string | null; staff_note: string | null; paid_at: string | null; created_at: string };
type Addon = { id: string; name: string; description: string | null; price_kobo: number; unit: string; active: boolean; sort: number };

/** /admin/addons — paid extras to arrange, and the add-on catalogue. */
export const AdminAddons = () => {
  const [tab, setTab] = useState("todo");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [err, setErr] = useState(false);
  const [draft, setDraft] = useState({ name: "", description: "", price: "", unit: "each" });
  const load = useCallback(async () => {
    setErr(false);
    const [o, a] = await Promise.all([
      supabase.from("addon_orders").select("*").neq("status", "pending_payment").order("created_at", { ascending: false }).limit(200),
      supabase.from("addons").select("*").order("sort"),
    ]);
    if (o.error || a.error) return setErr(true);
    setOrders(o.data as Order[]); setAddons(a.data as Addon[]);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const arrange = async (o: Order) => {
    const note = ask("Note for the guest (e.g. driver name and time):");
    if (note === null) return;
    const { error } = await supabase.rpc("staff_addon_action", { _order_id: o.id, _action: "arranged", _note: note });
    if (error) toast.error(error.message); else { toast.success("Marked arranged"); load(); }
  };
  const add = async () => {
    const price = Math.round(Number(draft.price) * 100);
    if (draft.name.trim().length < 2 || !(price > 0)) return toast.error("Name and price are needed");
    const { error } = await supabase.from("addons").insert({ name: draft.name.trim().slice(0, 80), description: draft.description.trim().slice(0, 300) || null, price_kobo: price, unit: draft.unit.trim().slice(0, 20) || "each", sort: addons.length });
    if (error) toast.error(error.message); else { setDraft({ name: "", description: "", price: "", unit: "each" }); load(); }
  };
  const toggle = async (a: Addon) => {
    const { error } = await supabase.from("addons").update({ active: !a.active }).eq("id", a.id);
    if (error) toast.error(error.message); else load();
  };
  const reprice = async (a: Addon) => {
    const v = ask(`New price in naira for ${a.name}:`);
    if (v === null) return;
    const k = Math.round(Number(v) * 100);
    if (!(k > 0)) return toast.error("Enter a price");
    const { error } = await supabase.from("addons").update({ price_kobo: k }).eq("id", a.id);
    if (error) toast.error(error.message); else load();
  };

  const todo = (orders || []).filter((o) => o.status === "paid" || o.status === "needs_attention");
  const shown = tab === "todo" ? todo : (orders || []).filter((o) => !todo.includes(o));
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Add-ons</h1>
      <Tabs value={tab} onChange={setTab} tabs={[{ value: "todo", label: `To arrange (${todo.length})` }, { value: "done", label: "Done" }, { value: "catalogue", label: "Catalogue" }]} />
      {err ? <ErrorState onRetry={load} /> : orders === null ? <ListSkeleton /> : tab === "catalogue" ? (
        <div className="space-y-3">
          {addons.map((a) => (
            <div key={a.id} className="rounded-xl border border-border p-3 flex flex-wrap items-center justify-between gap-2">
              <div><p className="font-semibold text-[15px]">{a.name} · {fmtK(a.price_kobo)} / {a.unit}</p>{a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}</div>
              <div className="flex gap-2">
                <button type="button" onClick={() => reprice(a)} className="min-h-11 px-3 rounded-lg border border-border text-[13px] font-semibold">Change price</button>
                <button type="button" onClick={() => toggle(a)} className="min-h-11 px-3 rounded-lg border border-border text-[13px] font-semibold">{a.active ? "Hide" : "Show"}</button>
              </div>
            </div>
          ))}
          <div className="rounded-xl border border-dashed border-border p-3 grid gap-2 sm:grid-cols-4">
            <input aria-label="Name" placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="h-11 rounded-lg border border-border bg-background px-3 sm:col-span-2" />
            <input aria-label="Price in naira" placeholder="Price ₦" inputMode="numeric" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value.replace(/[^\d.]/g, "") })} className="h-11 rounded-lg border border-border bg-background px-3" />
            <input aria-label="Unit" placeholder="per…" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} className="h-11 rounded-lg border border-border bg-background px-3" />
            <input aria-label="Description" placeholder="Short description (optional)" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className="h-11 rounded-lg border border-border bg-background px-3 sm:col-span-3" />
            <Button onClick={add}>Add</Button>
          </div>
        </div>
      ) : !shown.length ? <EmptyState title={tab === "todo" ? "Nothing to arrange" : "No orders yet"} /> : (
        <div className="space-y-2">
          {shown.map((o) => (
            <div key={o.id} className="rounded-xl border border-border p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-[13px]">
                <p className="font-semibold text-[15px]">{o.addon_name} × {o.qty} · {fmtK(o.amount_kobo)}</p>
                <p className="text-muted-foreground">Paid {o.paid_at ? new Date(o.paid_at).toLocaleString("en-NG") : "—"} · <Link className="underline" to={`/admin/bookings?q=${o.booking_id}`}>Booking</Link></p>
                {o.note && <p>Guest note: {o.note}</p>}
                {o.staff_note && <p className="text-muted-foreground">Staff: {o.staff_note}</p>}
              </div>
              {o.status === "paid" || o.status === "needs_attention"
                ? <Button className="h-11 px-3 text-[13px]" onClick={() => arrange(o)}>Mark arranged</Button>
                : <Tag tone={o.status === "arranged" ? "done" : "fact"}>{o.status.replace(/_/g, " ")}</Tag>}
              {o.status === "needs_attention" && <p className="w-full text-xs text-destructive">Paid amount didn't match — check before arranging.</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

type Change = { id: string; booking_id: string; new_check_in: string; new_check_out: string; note: string | null; status: string; staff_note: string | null; created_at: string; bookings: { check_in_date: string; check_out_date: string; listing_code: string | null; partner_title: string | null; listings: { title: string } | null } | null };

/** /admin/date-changes — guests asking to move their dates. */
export const AdminDateChanges = () => {
  const [rows, setRows] = useState<Change[] | null>(null);
  const [err, setErr] = useState(false);
  const [tab, setTab] = useState("pending");
  const load = useCallback(async () => {
    setErr(false);
    const { data, error } = await supabase.from("booking_change_requests")
      .select("*, bookings(check_in_date,check_out_date,listing_code,partner_title,listings(title))").order("created_at", { ascending: false }).limit(200);
    if (error) return setErr(true);
    setRows(data as unknown as Change[]);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const act = async (r: Change, action: "approved" | "declined") => {
    const note = ask(action === "approved" ? "Note to the guest (price difference, next steps):" : "Reason for the guest:");
    if (note === null) return;
    const { error } = await supabase.rpc("staff_change_request_action", { _id: r.id, _action: action, _note: note });
    if (error) toast.error(error.message); else { toast.success(action === "approved" ? "Agreed — update the booking dates with the host" : "Declined"); load(); }
  };
  const shown = (rows || []).filter((r) => (tab === "pending" ? r.status === "pending" : r.status !== "pending"));
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Date changes</h1>
      <Tabs value={tab} onChange={setTab} tabs={[{ value: "pending", label: "Waiting" }, { value: "done", label: "Decided" }]} />
      {err ? <ErrorState onRetry={load} /> : rows === null ? <ListSkeleton /> : !shown.length ? <EmptyState title="No requests" /> : shown.map((r) => (
        <div key={r.id} className="rounded-xl border border-border p-3 text-[13px] space-y-1">
          <p className="font-semibold text-[15px]">{r.bookings?.listings?.title || r.bookings?.partner_title || "Stay"} {r.bookings?.listing_code ? `· ${r.bookings.listing_code}` : ""}</p>
          <p>Now: {r.bookings?.check_in_date} → {r.bookings?.check_out_date}</p>
          <p>Wants: <b>{r.new_check_in} → {r.new_check_out}</b></p>
          {r.note && <p className="text-muted-foreground">“{r.note}”</p>}
          {r.status === "pending" ? (
            <div className="flex gap-2 pt-1">
              <Button className="h-11 px-3 text-[13px]" onClick={() => act(r, "approved")}>Agree</Button>
              <Button className="h-11 px-3 text-[13px]" variant="secondary" onClick={() => act(r, "declined")}>Decline</Button>
            </div>
          ) : <Tag tone={r.status === "approved" ? "done" : "fact"}>{r.status}{r.staff_note ? ` · ${r.staff_note}` : ""}</Tag>}
        </div>
      ))}
    </div>
  );
};
