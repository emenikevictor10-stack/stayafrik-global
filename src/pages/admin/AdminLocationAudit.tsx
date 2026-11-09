import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { RefreshCw, CheckCircle2, AlertTriangle, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Seo } from "@/components/seo/Seo";
import { useLocations } from "@/hooks/useLocations";
import { LocationCombobox } from "@/components/location/LocationCombobox";
import { sharedLocations } from "@/lib/map-pins";
import { breadcrumb, type Location, type LocationType } from "@/lib/locations";

type Totals = { total: number; with_state: number; with_city: number; with_neighbourhood: number; neighbourhood_applicable_missing: number; complete: number; review: number };
type ReviewRow = { kind: "local" | "partner"; id: string; code: string; title: string; raw: string; suggestion_id: string | null; confidence: number | null; reason: string };
type Merge = { location_id: string; location_name: string; breadcrumb: string; variants: string[]; listings: number };

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

const TotalsCard = ({ label, t }: { label: string; t?: Totals }) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <p className="text-xs font-semibold text-muted-foreground">{label}</p>
    {!t ? <p className="text-sm text-muted-foreground mt-2">No data yet</p> : (
      <>
        <p className="text-2xl font-extrabold mt-1">{t.complete}<span className="text-sm font-medium text-muted-foreground"> / {t.total} complete</span></p>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Has state</dt><dd className="text-right">{t.with_state} ({pct(t.with_state, t.total)}%)</dd>
          <dt className="text-muted-foreground">Has city / area</dt><dd className="text-right">{t.with_city} ({pct(t.with_city, t.total)}%)</dd>
          <dt className="text-muted-foreground">Has neighbourhood</dt><dd className="text-right">{t.with_neighbourhood}</dd>
          <dt className="text-muted-foreground">Missing state</dt><dd className="text-right">{t.total - t.with_state}</dd>
          <dt className="text-muted-foreground">Missing city</dt><dd className="text-right">{t.total - t.with_city}</dd>
          <dt className="text-muted-foreground" title="Only counted where the city has neighbourhoods listed">Missing neighbourhood*</dt><dd className="text-right">{t.neighbourhood_applicable_missing}</dd>
          <dt className="text-muted-foreground">Needs review</dt><dd className="text-right font-semibold">{t.review}</dd>
        </dl>
      </>
    )}
  </div>
);

const AdminLocationAudit = () => {
  const { all, byId, refetch: refetchPlaces } = useLocations();
  const [summary, setSummary] = useState<Record<string, Totals>>({});
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [merges, setMerges] = useState<Merge[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [picks, setPicks] = useState<Record<string, Location | null>>({});
  const [newPlace, setNewPlace] = useState<{ name: string; type: LocationType; parent: Location | null; aliases: string }>({ name: "", type: "neighbourhood", parent: null, aliases: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const [s, local, partner, m] = await Promise.all([
      supabase.rpc("location_audit_summary"),
      supabase.from("listings").select("id,listing_code,title,location_raw,city,state,neighborhood,address,location_suggestion_id,location_confidence,city_id")
        .or("location_status.eq.review,city_id.is.null").limit(500),
      supabase.from("partner_location_map").select("rayprop_listing_id,title,raw_state,raw_city,raw_neighbourhood,raw_address,suggestion_id,confidence,city_id")
        .or("status.eq.review,city_id.is.null").limit(500),
      supabase.rpc("location_merge_report"),
    ]);
    setSummary((s.data as any) || {});
    const reason = (conf: number | null, sug: string | null) =>
      !sug ? "No place matched" : (conf ?? 0) < 0.6 ? "Low-confidence match" : "Only the state is known — city missing";
    setRows([
      ...((local.data as any[]) || []).map((r) => ({
        kind: "local" as const, id: r.id, code: r.listing_code || "", title: r.title,
        raw: r.location_raw || [r.neighborhood, r.city, r.state, r.address].filter(Boolean).join(", "),
        suggestion_id: r.location_suggestion_id, confidence: r.location_confidence, reason: reason(r.location_confidence, r.location_suggestion_id),
      })),
      ...((partner.data as any[]) || []).map((r) => ({
        kind: "partner" as const, id: r.rayprop_listing_id, code: `RP·${r.rayprop_listing_id}`, title: r.title || "Partner stay",
        raw: [r.raw_neighbourhood, r.raw_city, r.raw_state, r.raw_address].filter(Boolean).join(", ") || "(no address given)",
        suggestion_id: r.suggestion_id, confidence: r.confidence, reason: reason(r.confidence, r.suggestion_id),
      })),
    ]);
    setMerges(((m.data as any[]) || []) as Merge[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const confirm = async (r: ReviewRow) => {
    const loc = picks[`${r.kind}:${r.id}`] ?? (r.suggestion_id ? byId.get(r.suggestion_id) : null);
    if (!loc) return toast.error("Pick a place first");
    if (loc.type === "state") return toast.error("Pick a city or neighbourhood, not just the state");
    const { error } = await supabase.rpc("set_listing_location", { _kind: r.kind, _id: r.id, _location_id: loc.id });
    if (error) return toast.error(error.message);
    toast.success(`${r.title} → ${loc.name}`);
    setRows((x) => x.filter((y) => !(y.kind === r.kind && y.id === r.id)));
  };

  const retagAll = async () => {
    setBusy(true);
    const a = await supabase.rpc("retag_local_listings");
    const b = await supabase.functions.invoke("rayprop-api", { body: { action: "retag_locations" } });
    await supabase.rpc("refresh_location_counts");
    setBusy(false);
    if (a.error) toast.error(a.error.message);
    else toast.success(`Re-checked ${a.data} of your stays${b.data?.data?.tagged ? ` and ${b.data.data.tagged} partner stays` : ""}`);
    load();
  };

  const addPlace = async () => {
    const name = newPlace.name.trim();
    if (!name) return toast.error("Enter a name");
    if (newPlace.type !== "state" && !newPlace.parent) return toast.error("Choose where it sits");
    const slug = [name, newPlace.parent?.name].filter(Boolean).join("-").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { error } = await supabase.from("locations").insert({
      name, slug, type: newPlace.type, parent_id: newPlace.parent?.id ?? null,
      aliases: newPlace.aliases.split(",").map((s) => s.trim()).filter(Boolean),
    });
    if (error) return toast.error(error.message.includes("duplicate") ? "That place already exists there" : error.message);
    toast.success(`Added ${name}. Press "Re-check all" to match listings to it.`);
    setNewPlace({ name: "", type: "neighbourhood", parent: null, aliases: "" });
    refetchPlaces();
  };

  const parentTypes = useMemo<LocationType[]>(() => (newPlace.type === "neighbourhood" ? ["city"] : ["state"]), [newPlace.type]);

  return (
    <>
      <Seo title="Location audit | Stay admin" description="Place tagging for every listing." noindex />
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Location audit</h1>
          <p className="text-sm text-muted-foreground">Every stay should have a state and city, plus a neighbourhood where the city has them.</p>
        </div>
        <button onClick={retagAll} disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} /> Re-check all
        </button>
      </header>

      <section className="grid gap-4 md:grid-cols-2 mb-6">
        <TotalsCard label="Your stays" t={summary.local} />
        <TotalsCard label="Partner stays" t={summary.partner} />
      </section>
      <p className="text-xs text-muted-foreground -mt-4 mb-6">* A stay in a city with no neighbourhoods listed counts as complete with state + city.</p>

      <section className="mb-8">
        <h2 className="text-base font-bold mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-destructive" /> Review list ({rows.length})</h2>
        {loading ? <div className="h-24 rounded-xl bg-muted animate-pulse" /> : !rows.length ? (
          <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" /> Nothing to review — every stay is tagged.
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => {
              const key = `${r.kind}:${r.id}`;
              const sug = r.suggestion_id ? byId.get(r.suggestion_id) : undefined;
              const chosen = picks[key] ?? sug ?? null;
              return (
                <div key={key} className="rounded-xl border border-border bg-card p-3 grid gap-3 md:grid-cols-[1.4fr_1fr_auto] md:items-center">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-mono">{r.code}</span> · {r.kind === "partner" ? "Partner" : "Your stay"} · {r.reason}
                    </p>
                    <p className="text-xs mt-1 break-words"><span className="text-muted-foreground">Raw:</span> {r.raw || "—"}</p>
                    <p className="text-xs"><span className="text-muted-foreground">Suggested:</span> {sug ? `${sug.name}${breadcrumb(sug, byId) ? ` — ${breadcrumb(sug, byId)}` : ""}` : "none"}
                      {r.confidence != null && <span className="text-muted-foreground"> ({Math.round(Number(r.confidence) * 100)}%)</span>}</p>
                  </div>
                  <LocationCombobox all={all} byId={byId} value={chosen?.name || ""} types={["city", "neighbourhood"]}
                    placeholder="Search a place…" onPick={(l) => setPicks((p) => ({ ...p, [key]: l }))} />
                  <button onClick={() => confirm(r)}
                    className="rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-bold">Confirm</button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <SharedLocations />
      <section className="mb-8">
        <h2 className="text-base font-bold mb-2">Add a missing place</h2>
        <div className="rounded-xl border border-border bg-card p-3 grid gap-3 md:grid-cols-4 md:items-end">
          <label className="text-xs">Name
            <input value={newPlace.name} onChange={(e) => setNewPlace((p) => ({ ...p, name: e.target.value }))}
              className="mt-1.5 w-full rounded-xl bg-card border border-border px-4 py-3 text-sm" placeholder="e.g. Oasis Park" />
          </label>
          <label className="text-xs">Type
            <select value={newPlace.type} onChange={(e) => setNewPlace((p) => ({ ...p, type: e.target.value as LocationType, parent: null }))}
              className="mt-1.5 w-full rounded-xl bg-card border border-border px-4 py-3 text-sm">
              <option value="neighbourhood">Neighbourhood</option><option value="city">City / area</option>
            </select>
          </label>
          <div className="text-xs">Sits in
            <LocationCombobox all={all} byId={byId} value={newPlace.parent?.name || ""} types={parentTypes}
              placeholder={newPlace.type === "neighbourhood" ? "City e.g. Lekki" : "State e.g. Lagos"}
              onPick={(l) => setNewPlace((p) => ({ ...p, parent: l }))} />
          </div>
          <label className="text-xs">Other spellings (comma separated)
            <input value={newPlace.aliases} onChange={(e) => setNewPlace((p) => ({ ...p, aliases: e.target.value }))}
              className="mt-1.5 w-full rounded-xl bg-card border border-border px-4 py-3 text-sm" placeholder="optional" />
          </label>
          <button onClick={addPlace} className="md:col-span-4 inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold">
            <Plus className="w-4 h-4" /> Add place
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-base font-bold mb-2">Spellings merged into one place ({merges.length})</h2>
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead className="text-left text-xs text-muted-foreground"><tr>
              <th className="p-3">Canonical place</th><th className="p-3">Spellings found in listings</th><th className="p-3 text-right">Stays</th>
            </tr></thead>
            <tbody>
              {merges.map((m) => (
                <tr key={m.location_id} className="border-t border-border align-top">
                  <td className="p-3"><span className="font-semibold">{m.location_name}</span><span className="block text-xs text-muted-foreground">{m.breadcrumb}</span></td>
                  <td className="p-3"><div className="flex flex-wrap gap-1">{m.variants.map((v) => <span key={v} className="rounded-full bg-muted px-2 py-0.5 text-xs">{v}</span>)}</div></td>
                  <td className="p-3 text-right">{m.listings}</td>
                </tr>
              ))}
              {!merges.length && !loading && <tr><td colSpan={3} className="p-4 text-muted-foreground">No duplicate spellings found.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
};

export default AdminLocationAudit;

type Pt = { id: string; listing_code: string | null; title: string; lat: number | null; lng: number | null; neighborhood: string | null; city: string | null };

/** Our stays saved at (almost) the same map point — usually copied or default locations. Shown for admins to fix; never moved automatically. */
const SharedLocations = () => {
  const [groups, setGroups] = useState<Pt[][] | null>(null);
  useEffect(() => {
    supabase.from("listings").select("id,listing_code,title,lat,lng,neighborhood,city").not("lat", "is", null).limit(2000)
      .then(({ data }) => setGroups(sharedLocations((data as Pt[]) || [])));
  }, []);
  if (!groups) return null;
  return (
    <section className="mb-8">
      <h2 className="text-base font-bold mb-1">Stays sharing one map spot ({groups.reduce((n, g) => n + g.length, 0)})</h2>
      <p className="text-xs text-muted-foreground mb-2">These stays are saved within about 30 m of each other, so they bunch together on the map. Ask the host for the right area, or fix it on the listing.</p>
      {!groups.length ? <p className="text-sm text-muted-foreground">None — every stay has its own spot.</p> : (
        <div className="space-y-2">
          {groups.map((g) => (
            <details key={g[0].id} className="rounded-xl border border-border p-3">
              <summary className="cursor-pointer text-sm font-semibold min-h-11 flex items-center">{g.length} stays at {g[0].lat?.toFixed(4)}, {g[0].lng?.toFixed(4)}</summary>
              <ul className="mt-2 space-y-1 text-[13px]">
                {g.map((x) => (
                  <li key={x.id} className="flex justify-between gap-2">
                    <span className="truncate">{x.title} <span className="text-muted-foreground">· {[x.neighborhood, x.city].filter(Boolean).join(", ")}</span></span>
                    <a href={`/admin/listings?q=${encodeURIComponent(x.listing_code || x.id)}`} className="underline shrink-0">{x.listing_code || "Open"}</a>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      )}
    </section>
  );
};
