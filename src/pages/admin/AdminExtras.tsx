import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button, EmptyState, ErrorState, ListSkeleton, Tabs, Tag } from "@/ui/kit";
import { toast } from "sonner";
import { ADDON_STATUS_LABEL } from "@/lib/addons";

const fmtK = (k: number) => "₦" + Math.round(Number(k || 0) / 100).toLocaleString();
const ask = (q: string) => window.prompt(q) ?? null;

type Order = { id: string; booking_id: string; addon_name: string; qty: number; amount_kobo: number; status: string; note: string | null; staff_note: string | null; paid_at: string | null; created_at: string; reference: string | null; pay_method: string | null };
type Addon = { id: string; name: string; description: string | null; price_kobo: number; unit: string; active: boolean; sort: number; city_id: string | null };
type City = { id: string; name: string };
type Draft = { name: string; description: string; price: string; unit: string; city_id: string };
const emptyDraft: Draft = { name: "", description: "", price: "", unit: "each", city_id: "" };

const AddonForm = ({ value, cities, onSave, onCancel, label }: { value: Draft; cities: City[]; onSave: (d: Draft) => void; onCancel?: () => void; label: string }) => {
  const [d, setD] = useState(value);
  const cls = "h-11 rounded-lg border border-border bg-background px-3";
  return (
    <div className="grid gap-2 sm:grid-cols-6">
      <input aria-label="Name" placeholder="Name" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} className={`${cls} sm:col-span-2`} />
      <input aria-label="Price in naira" placeholder="Price ₦" inputMode="numeric" value={d.price} onChange={(e) => setD({ ...d, price: e.target.value })} className={cls} />
      <input aria-label="Unit" placeholder="Unit (each, trip)" value={d.unit} onChange={(e) => setD({ ...d, unit: e.target.value })} className={cls} />
      <select aria-label="City" value={d.city_id} onChange={(e) => setD({ ...d, city_id: e.target.value })} className={`${cls} sm:col-span-2`}>
        <option value="">All cities</option>
        {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <input aria-label="Description" placeholder="Short description" value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} className={`${cls} sm:col-span-4`} />
      <div className="flex gap-2 sm:col-span-2">
        <Button className="h-11 px-3 text-[13px]" onClick={() => onSave(d)}>{label}</Button>
        {onCancel && <Button variant="secondary" className="h-11 px-3 text-[13px]" onClick={onCancel}>Cancel</Button>}
      </div>
    </div>
  );
};

/** /admin/addons — paid extras to confirm and complete, refunds due, and the catalogue. */
export const AdminAddons = () => {
  const [tab, setTab] = useState("todo");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const load = useCallback(async () => {
    setErr(false);
    const [o, a, c] = await Promise.all([
      supabase.from("addon_orders").select("*").neq("status", "pending_payment").order("created_at", { ascending: false }).limit(200),
      supabase.from("addons").select("*").order("sort"),
      supabase.from("locations").select("id,name").eq("type", "city").eq("is_active", true).order("name"),
    ]);
    if (o.error || a.error) return setErr(true);
    setOrders(o.data as Order[]); setAddons(a.data as Addon[]); setCities((c.data as City[]) || []);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const act = async (o: Order, action: "confirm" | "done" | "cancel" | "refunded") => {
    const q = action === "confirm" ? "Note for the guest (e.g. driver name and time):" : action === "cancel" ? `Cancel ${o.addon_name}? Reason for the guest:` : action === "refunded" ? `Refund reference for ${fmtK(o.amount_kobo)} (optional):` : "Note (optional):";
    const note = ask(q);
    if (note === null) return;
    const { error } = await supabase.rpc("staff_addon_action", { _order_id: o.id, _action: action, _note: note });
    if (error) toast.error(error.message); else { toast.success("Saved"); load(); }
  };
  const toRow = (d: Draft) => {
    const price = Math.round(Number(d.price) * 100);
    if (d.name.trim().length < 2 || !(price > 0)) { toast.error("Name and price are needed"); return null; }
    return { name: d.name.trim().slice(0, 80), description: d.description.trim().slice(0, 300) || null, price_kobo: price, unit: d.unit.trim().slice(0, 20) || "each", city_id: d.city_id || null };
  };
  const add = async (d: Draft) => {
    const row = toRow(d); if (!row) return;
    const { error } = await supabase.from("addons").insert({ ...row, sort: addons.length });
    if (error) toast.error(error.message); else { toast.success("Added"); load(); }
  };
  const save = async (a: Addon, d: Draft) => {
    const row = toRow(d); if (!row) return;
    const { error } = await supabase.from("addons").update(row).eq("id", a.id);
    if (error) toast.error(error.message); else { setEditing(null); load(); }
  };
  const toggle = async (a: Addon) => {
    const { error } = await supabase.from("addons").update({ active: !a.active }).eq("id", a.id);
    if (error) toast.error(error.message); else load();
  };

  const all = orders || [];
  const todo = all.filter((o) => ["paid", "needs_attention", "confirmed"].includes(o.status));
  const refunds = all.filter((o) => o.status === "refund_due");
  const shown = tab === "todo" ? todo : tab === "refunds" ? refunds : all.filter((o) => ["done", "refunded", "cancelled"].includes(o.status));
  const cityName = (id: string | null) => (id ? cities.find((c) => c.id === id)?.name ?? "One city" : "All cities");
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Add-ons</h1>
      <Tabs value={tab} onChange={setTab} tabs={[{ value: "todo", label: `To do (${todo.length})` }, { value: "refunds", label: `Refunds due (${refunds.length})` }, { value: "done", label: "Closed" }, { value: "catalogue", label: "Catalogue" }]} />
      {err ? <ErrorState onRetry={load} /> : orders === null ? <ListSkeleton /> : tab === "catalogue" ? (
        <div className="space-y-3">
          {addons.map((a) => (
            <div key={a.id} className="rounded-xl border border-border p-3 space-y-2">
              {editing === a.id ? (
                <AddonForm label="Save" cities={cities} value={{ name: a.name, description: a.description ?? "", price: String(a.price_kobo / 100), unit: a.unit, city_id: a.city_id ?? "" }} onSave={(d) => save(a, d)} onCancel={() => setEditing(null)} />
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[15px]">{a.name} · {fmtK(a.price_kobo)} / {a.unit} {!a.active && <Tag tone="fact">Hidden</Tag>}</p>
                    <p className="text-xs text-muted-foreground">{cityName(a.city_id)}{a.description ? ` · ${a.description}` : ""}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setEditing(a.id)} className="min-h-11 px-3 rounded-lg border border-border text-[13px] font-semibold">Edit</button>
                    <button type="button" onClick={() => toggle(a)} className="min-h-11 px-3 rounded-lg border border-border text-[13px] font-semibold">{a.active ? "Switch off" : "Switch on"}</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div className="rounded-xl border border-dashed border-border p-3 space-y-2">
            <p className="text-[13px] font-semibold">New extra</p>
            <AddonForm key={addons.length} label="Add extra" cities={cities} value={emptyDraft} onSave={add} />
          </div>
        </div>
      ) : !shown.length ? <EmptyState title={tab === "todo" ? "Nothing to arrange" : tab === "refunds" ? "No refunds due" : "Nothing yet"} /> : (
        <div className="space-y-2">
          {shown.map((o) => (
            <div key={o.id} className="rounded-xl border border-border p-3 flex flex-wrap items-center justify-between gap-2 text-[13px]">
              <div>
                <p className="font-semibold text-[15px]">{o.addon_name} × {o.qty} · {fmtK(o.amount_kobo)}</p>
                <p className="text-muted-foreground">{o.pay_method === "bank_transfer" ? "Bank transfer" : "Card"} · {o.reference}{o.note ? ` · “${o.note}”` : ""}</p>
                {o.staff_note && <p className="text-xs text-muted-foreground">{o.staff_note}</p>}
                <Link to={`/admin/bookings?q=${o.booking_id}`} className="text-xs underline">Open booking</Link>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Tag tone={["done", "refunded"].includes(o.status) ? "done" : o.status === "needs_attention" ? "act" : "fact"}>{ADDON_STATUS_LABEL[o.status] ?? o.status}</Tag>
                {["paid", "needs_attention"].includes(o.status) && <Button className="h-11 px-3 text-[13px]" onClick={() => act(o, "confirm")}>Confirm</Button>}
                {o.status === "confirmed" && <Button className="h-11 px-3 text-[13px]" onClick={() => act(o, "done")}>Mark done</Button>}
                {o.status === "refund_due" && <Button className="h-11 px-3 text-[13px]" onClick={() => act(o, "refunded")}>Mark refunded</Button>}
                {["paid", "needs_attention", "confirmed"].includes(o.status) && <Button variant="secondary" className="h-11 px-3 text-[13px]" onClick={() => act(o, "cancel")}>Cancel</Button>}
              </div>
              {o.status === "needs_attention" && <p className="w-full text-xs text-destructive">Paid amount didn't match — check before confirming.</p>}
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
