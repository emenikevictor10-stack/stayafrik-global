import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button, ErrorState, ListSkeleton } from "@/ui/kit";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_FEATURES, FEATURE_KEYS, type FeatureKey } from "@/lib/settings";
import { SETTINGS_QUERY_KEY } from "@/hooks/useSettings";

const FEATURE_LABELS: Record<FeatureKey, [string, string]> = {
  search_fields: ["Search fields on Home", "Where, When, Who bar on the Home page"],
  card_payments: ["Card payments", "Off means bank transfer only"],
  holds: ["Holds", "Off means book straight to reservation"],
  report_problem: ["Report a problem", "Guests can report a problem from Trips"],
  id_required: ["ID required before paying", "NIN or passport must be sent before paying"],
  map: ["Maps", "Show maps on stay pages and Explore"],
  whatsapp: ["WhatsApp", "Not built yet: stays off"],
  phone_signin: ["Phone sign-in", "Not built yet: stays off"],
  mapbox: ["Mapbox tiles", "Off uses free map tiles"],
  split_payments: ["Split payments", "Guests can split a local stay's cost with friends"],
  addons: ["Add-ons", "Guests can buy extras (airport pickup, groceries…) for confirmed trips"],
  invoices: ["Invoices", "Guests and staff can make and print invoices"],
  bank_transfer: ["Bank transfer", "Guests can pay by bank transfer; staff approve each one"],
};

type Field = { key: string; label: string; kind: "naira" | "percent" | "int" | "text" | "long" | "bool"; unit?: string; help?: string };
const SECTIONS: { title: string; fields: Field[] }[] = [
  { title: "Money", fields: [
    { key: "service_fee_bps", label: "Service fee on local stays", kind: "percent" },
    { key: "markup_per_night_kobo", label: "Markup per night on RayProp stays", kind: "naira", help: "Leave empty to keep the current server value." },
    { key: "commission_bps", label: "Host commission (own stays)", kind: "percent" },
    { key: "guest_service_fee_bps", label: "Guest fee on own stays", kind: "percent" },
    { key: "payout_delay_days", label: "Days after check-in before payout is due", kind: "int", unit: "days" },
  ] },
  { title: "Time limits", fields: [
    { key: "hold_minutes", label: "Hold dates for", kind: "int", unit: "min" },
    { key: "split_hold_hours", label: "Split payment: everyone pays within", kind: "int", unit: "hours" },
    { key: "payment_window_minutes", label: "Time to pay after reserving", kind: "int", unit: "min" },
    { key: "reply_target_urgent_minutes", label: "Reply target, urgent problems", kind: "int", unit: "min" },
    { key: "reply_target_normal_minutes", label: "Reply target, other problems", kind: "int", unit: "min" },
    { key: "host_accept_hours", label: "Time a host has to accept", kind: "int", unit: "hours" },
    { key: "ical_sync_minutes", label: "Calendar sync every", kind: "int", unit: "min" },
    { key: "instant_book_default", label: "New own stays book instantly", kind: "bool" },
  ] },
  { title: "Contact and alerts", fields: [
    { key: "support_email", label: "Support email", kind: "text" },
    { key: "staff_alert_emails", label: "Staff alert emails", kind: "text", help: "Separate with commas." },
    { key: "staff_alert_phones", label: "Staff alert phones", kind: "text", help: "Separate with commas." },
    { key: "wallet_alert_threshold_kobo", label: "Alert when RayProp wallet is below", kind: "naira" },
    { key: "sg_bank_account", label: "Bank account for transfers", kind: "text" },
    { key: "bank_transfer_bank", label: "Bank transfer: bank name", kind: "text" },
    { key: "bank_transfer_number", label: "Bank transfer: account number", kind: "text" },
    { key: "bank_transfer_name", label: "Bank transfer: account name", kind: "text" },
    { key: "bank_transfer_hold_minutes", label: "Bank transfer: time to pay", kind: "int", unit: "minutes" },
  ] },
  { title: "Company and guarantee", fields: [
    { key: "company", label: "Company details (on invoices)", kind: "long" },
    { key: "guarantee_text", label: "Guarantee wording", kind: "long" },
  ] },
];

/** jsonb value -> form string, and back. */
const toForm = (f: Field, v: unknown): string | boolean => {
  if (f.kind === "bool") return v === true;
  if (v === null || v === undefined) return "";
  if (f.kind === "percent") return String(Number(v) / 100);
  if (f.kind === "naira") return String(Number(v) / 100);
  return String(v);
};
const fromForm = (f: Field, v: string | boolean): { ok: true; value: unknown } | { ok: false; error: string } => {
  if (f.kind === "bool") return { ok: true, value: !!v };
  const s = String(v).trim();
  if (f.kind === "text" || f.kind === "long") return { ok: true, value: s };
  if (s === "" && f.kind === "naira") return { ok: true, value: null };
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return { ok: false, error: `${f.label}: enter a number of 0 or more` };
  if (f.kind === "percent") { if (n > 50) return { ok: false, error: `${f.label}: 50% at most` }; return { ok: true, value: Math.round(n * 100) }; }
  if (f.kind === "naira") return { ok: true, value: Math.round(n * 100) };
  return { ok: true, value: Math.round(n) };
};

const AdminSettings = () => {
  const qc = useQueryClient();
  const [raw, setRaw] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState<Record<string, string | boolean>>({});
  const [feat, setFeat] = useState<Record<FeatureKey, boolean>>(DEFAULT_FEATURES);
  const [err, setErr] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setErr(false);
    const { data, error } = await supabase.from("app_settings").select("key,value");
    if (error) { setErr(true); return; }
    const m = Object.fromEntries((data || []).map((r) => [r.key, r.value]));
    setRaw(m);
    const f: Record<string, string | boolean> = {};
    SECTIONS.forEach((s) => s.fields.forEach((fl) => { f[fl.key] = toForm(fl, m[fl.key]); }));
    setForm(f);
    setFeat({ ...DEFAULT_FEATURES, ...((m.features as object) || {}) });
  };
  useEffect(() => { load(); }, []);

  const upsert = async (rows: { key: string; value: unknown }[], section: string) => {
    setSaving(section);
    const { error } = await supabase.from("app_settings").upsert(rows as any, { onConflict: "key" });
    setSaving(null);
    if (error) return toast.error(error.message.includes("row-level") ? "Only admins can change settings." : error.message);
    toast.success(`${section} saved`);
    qc.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
    load();
  };

  const saveSection = (title: string, fields: Field[]) => {
    const rows: { key: string; value: unknown }[] = [];
    for (const f of fields) {
      const r = fromForm(f, form[f.key]);
      if (r.ok === false) return toast.error(r.error);
      rows.push({ key: f.key, value: r.value });
    }
    upsert(rows, title);
  };

  if (err) return <ErrorState message="Settings didn't load." onRetry={load} />;
  if (!raw) return <ListSkeleton rows={4} />;

  return (
    <div className="max-w-[760px] space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-[13px] text-muted-foreground">Changes apply straight away and are saved in the audit log.</p>
      </header>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold mb-3">Switches</h2>
        <ul className="divide-y divide-border">
          {FEATURE_KEYS.map((k) => (
            <li key={k} className="flex items-center justify-between gap-4 py-3">
              <label htmlFor={`f-${k}`} className="min-w-0">
                <span className="block text-[15px]">{FEATURE_LABELS[k][0]}</span>
                <span className="block text-[13px] text-muted-foreground">{FEATURE_LABELS[k][1]}</span>
              </label>
              <Switch id={`f-${k}`} checked={feat[k]} disabled={k === "whatsapp" || k === "phone_signin"}
                onCheckedChange={(v) => setFeat((f) => ({ ...f, [k]: v }))} />
            </li>
          ))}
        </ul>
        <div className="flex justify-end mt-3">
          <Button loading={saving === "Switches"} onClick={() => upsert([{ key: "features", value: feat }], "Switches")}>Save switches</Button>
        </div>
      </section>

      {SECTIONS.map(({ title, fields }) => (
        <section key={title} className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold mb-3">{title}</h2>
          <div className="space-y-4">
            {fields.map((f) => (
              <div key={f.key} className={f.kind === "bool" ? "flex items-center justify-between gap-4" : ""}>
                <label htmlFor={`s-${f.key}`} className="block text-[13px] font-semibold mb-1">{f.label}</label>
                {f.kind === "bool" ? (
                  <Switch id={`s-${f.key}`} checked={!!form[f.key]} onCheckedChange={(v) => setForm((x) => ({ ...x, [f.key]: v }))} />
                ) : f.kind === "long" ? (
                  <Textarea id={`s-${f.key}`} value={String(form[f.key] ?? "")} onChange={(e) => setForm((x) => ({ ...x, [f.key]: e.target.value }))} rows={3} />
                ) : (
                  <div className="flex items-center gap-2">
                    {f.kind === "naira" && <span className="text-[13px] text-muted-foreground">₦</span>}
                    <Input id={`s-${f.key}`} inputMode={f.kind === "text" ? undefined : "decimal"} value={String(form[f.key] ?? "")}
                      onChange={(e) => setForm((x) => ({ ...x, [f.key]: e.target.value }))} className={f.kind === "text" ? "" : "max-w-[200px]"} />
                    {f.kind === "percent" && <span className="text-[13px] text-muted-foreground">%</span>}
                    {f.unit && <span className="text-[13px] text-muted-foreground">{f.unit}</span>}
                  </div>
                )}
                {f.help && <p className="text-xs text-muted-foreground mt-1">{f.help}</p>}
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-4">
            <Button loading={saving === title} onClick={() => saveSection(title, fields)}>Save {title.toLowerCase()}</Button>
          </div>
        </section>
      ))}
    </div>
  );
};

export default AdminSettings;
