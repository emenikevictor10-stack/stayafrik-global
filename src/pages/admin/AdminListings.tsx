import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { CheckCircle2, ShieldX, Loader2, ChevronLeft, MapPin, BedDouble, Bath, Ruler, Tag, User2, Mail, Phone, X, ChevronRight, Search, List, LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Seo } from "@/components/seo/Seo";
import { logAdminAction } from "@/lib/admin-audit";

/** Image that degrades gracefully when the browser can't decode the file (e.g. legacy HEIC uploads). */
const SafeImg = ({ src, alt, className }: { src: string; alt: string; className?: string }) => {
  const [failed, setFailed] = useState(false);
  if (failed)
    return (
      <div className="w-full h-full bg-secondary flex flex-col items-center justify-center gap-1 text-center p-2">
        <span className="text-lg">🖼️</span>
        <span className="text-[10px] text-muted-foreground leading-tight">
          Unsupported format (HEIC) — ask host to re-upload
        </span>
      </div>
    );
  return <img src={src} alt={alt} className={className} loading="lazy" onError={() => setFailed(true)} />;
};

type ListingRow = {
  id: string;
  title: string;
  description: string | null;
  type: string | null;
  city: string | null;
  state?: string | null;
  neighborhood?: string | null;
  address: string | null;
  location: string | null;
  price_per_night: number;
  images: string[];
  video_url: string | null;
  bedrooms: number;
  bathrooms: number;
  area: string | null;
  amenities: string[] | null;
  lat: number | null;
  lng: number | null;
  verified: boolean;
  is_available: boolean;
  created_at: string;
  host_id: string;
  listing_code: string | null;
};

type HostProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
};

const Lightbox = ({ images, start, onClose }: { images: string[]; start: number; onClose: () => void }) => {
  const [i, setI] = useState(start);
  const go = (n: number) => setI((i + n + images.length) % images.length);
  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={onClose}>
      <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center" onClick={onClose}><X className="w-5 h-5" /></button>
      <button className="absolute left-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center" onClick={(e) => { e.stopPropagation(); go(-1); }}><ChevronLeft className="w-5 h-5" /></button>
      <img src={images[i]} alt="" className="max-h-[90vh] max-w-[92vw] object-contain" onClick={(e) => e.stopPropagation()} />
      <button className="absolute right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center" onClick={(e) => { e.stopPropagation(); go(1); }}><ChevronRight className="w-5 h-5" /></button>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 text-white text-xs">{i + 1} / {images.length}</div>
    </div>
  );
};

type Tab = "pending" | "approved";

const AdminListings = () => {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("pending");
  const [rows, setRows] = useState<ListingRow[]>([]);
  const [hosts, setHosts] = useState<Record<string, HostProfile>>({});
  const [busy, setBusy] = useState(false);
  const [lightbox, setLightbox] = useState<{ images: string[]; start: number } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ kind: "approve" | "reject" | "revoke"; row: ListingRow } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [q, setQ] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [view, setView] = useState<"detail" | "grid">("detail");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin" as any)
        .maybeSingle();
      setIsAdmin(!!data);
    })();
  }, [user]);

  const load = async () => {
    setBusy(true);
    const { data } = await supabase
      .from("listings")
      .select("*")
      .eq("verified", tab === "approved")
      .order("created_at", { ascending: false });
    const list = (data as ListingRow[]) || [];
    setRows(list);
    const hostIds = Array.from(new Set(list.map((r) => r.host_id)));
    if (hostIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id:user_id,email,full_name,phone,avatar_url")
        .in("user_id", hostIds);
      const map: Record<string, HostProfile> = {};
      (profs as HostProfile[] | null)?.forEach((p) => (map[p.id] = p));
      setHosts(map);
    } else {
      setHosts({});
    }
    setBusy(false);
  };

  const term = q.trim().toLowerCase();
  const states = Array.from(new Set(rows.map((r) => r.state).filter(Boolean) as string[])).sort();
  const shown = rows
    .filter((r) => !stateFilter || r.state === stateFilter)
    .filter((r) => !term || [r.listing_code, r.title, r.city, r.state, r.neighborhood, r.location, r.address].some((v) => (v || "").toLowerCase().includes(term)));

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, tab]);

  const notifyHost = async (row: ListingRow, type: string, title: string, body: string) => {
    const { error } = await supabase.from("notifications").insert({
      user_id: row.host_id, type, title, body, link: "/listings",
    });
    if (error) console.error("[admin] host notification failed", error);
  };

  const doApprove = async (id: string) => {
    const row = rows.find((x) => x.id === id);
    setSubmitting(true);
    const { error } = await supabase
      .from("listings")
      .update({ verified: true, is_available: true })
      .eq("id", id);
    setSubmitting(false);
    if (error) return toast.error(error.message);
    if (row) {
      await notifyHost(row, "listing_approved", "Listing approved 🎉", `Your listing "${row.title}" is now live.`);
      await logAdminAction({ action: "listing_approved", entityType: "listing", entityId: id, metadata: { listing_code: row.listing_code } });
    }
    toast.success("Listing approved and live");
    setRows((r) => r.filter((x) => x.id !== id));
    setConfirmAction(null);
  };

  const doRevoke = async (row: ListingRow, reason: string) => {
    setSubmitting(true);
    const { error } = await supabase
      .from("listings")
      .update({ verified: false, is_available: false })
      .eq("id", row.id);
    setSubmitting(false);
    if (error) return toast.error(error.message);
    await notifyHost(row, "listing_revoked", "Listing moved back to pending",
      `Your listing "${row.title}" was moved back to pending review.${reason ? ` Reason: ${reason}` : ""}`);
    await logAdminAction({ action: "listing_revoked", entityType: "listing", entityId: row.id, metadata: { listing_code: row.listing_code, reason: reason || null } });
    toast.success("Listing reverted to pending");
    setRows((r) => r.filter((x) => x.id !== row.id));
    setConfirmAction(null);
    setRejectReason("");
  };

  const doReject = async (row: ListingRow, reason: string) => {
    setSubmitting(true);
    const { error } = await supabase.from("listings").delete().eq("id", row.id);
    setSubmitting(false);
    if (error) return toast.error(error.message);
    await notifyHost(row, "listing_rejected", "Listing rejected",
      `Your listing "${row.title}" was not approved.${reason ? ` Reason: ${reason}` : ""}`);
    await logAdminAction({ action: "listing_rejected", entityType: "listing", entityId: row.id, metadata: { listing_code: row.listing_code, title: row.title, reason: reason || null } });
    toast.success("Listing removed");
    setRows((r) => r.filter((x) => x.id !== row.id));
    setConfirmAction(null);
    setRejectReason("");
  };


  if (loading || isAdmin === null) {
    return <main className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></main>;
  }
  if (!user) return <Navigate to="/auth?mode=signin" replace />;
  if (!isAdmin) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <ShieldX className="w-12 h-12 text-destructive mb-3" />
        <h1 className="text-xl font-extrabold">Admin only</h1>
        <p className="text-sm text-muted-foreground mt-2">You need the admin role to view this page.</p>
        <Link to="/" className="mt-6 text-primary text-sm font-bold">← Back home</Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pb-12">
      <Seo title="Admin · listings" description="Approve, reject or revoke host listings." noindex />
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border px-5 py-3 flex items-center gap-3">
        <Link to="/admin" className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-base font-extrabold">Listings</h1>
          <p className="text-[11px] text-muted-foreground">{rows.length} {tab === "pending" ? "pending review" : "approved & live"}</p>
        </div>
        <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} aria-label="Filter by state"
          className="h-9 rounded-full bg-card border border-border px-3 text-xs">
          <option value="">All states</option>
          {states.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="relative w-40 sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Listing ID, title, city"
            className="w-full h-9 rounded-full bg-card border border-border pl-9 pr-3 text-xs outline-none focus:border-primary" />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 md:px-6 pt-4">
        <div className="inline-flex p-1 rounded-xl bg-secondary border border-border">
          {(["pending", "approved"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${
                tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "pending" ? "Pending" : "Approved"}
            </button>
          ))}
        </div>
        <div className="inline-flex p-1 rounded-xl bg-secondary border border-border ml-2 align-top" role="group" aria-label="View">
          {([["detail", List, "Detail"], ["grid", LayoutGrid, "Grid"]] as const).map(([v, Icon, label]) => (
            <button key={v} type="button" onClick={() => setView(v)} aria-pressed={view === v}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition inline-flex items-center gap-1.5 ${
                view === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 pt-5 space-y-6">
        {busy && <div className="text-center py-8 text-sm text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>}
        {!busy && rows.length > 0 && shown.length === 0 && (
          <div className="text-center py-12 text-sm text-muted-foreground">No listings match "{q}".</div>
        )}
        {!busy && rows.length === 0 && (
          <div className="text-center py-16 text-sm text-muted-foreground">
            <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2" />
            {tab === "pending" ? "All caught up." : "No approved listings yet."}
          </div>
        )}
        {view === "detail" && shown.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="hidden md:grid grid-cols-[56px_1.6fr_1.2fr_0.7fr_0.8fr_1fr_0.9fr_auto] gap-3 px-3 py-2 bg-secondary/50 text-[10px] font-bold uppercase text-muted-foreground">
            <span />
            <span>Listing</span><span>Place</span><span>Beds / baths</span><span>Price / night</span><span>Host</span><span>Submitted</span><span className="text-right">Actions</span>
          </div>
        {shown.map((r) => {
          const host = hosts[r.host_id];
          const images = r.images || [];
          const hero = images[0];
          const rest = images.slice(1);
          const isOpen = expanded === r.id;
          return (
            <div key={r.id} id={`listing-${r.id}`} className="scroll-mt-20 border-t border-border first:border-t-0">
            <div role="button" tabIndex={0} onClick={() => setExpanded(isOpen ? null : r.id)} onKeyDown={(e) => e.key === "Enter" && setExpanded(isOpen ? null : r.id)}
              className={`grid grid-cols-[56px_1fr_auto] md:grid-cols-[56px_1.6fr_1.2fr_0.7fr_0.8fr_1fr_0.9fr_auto] gap-3 px-3 py-2 items-center cursor-pointer hover:bg-secondary/40 ${isOpen ? "bg-secondary/40" : ""}`}>
              <div className="w-14 h-11 rounded-lg overflow-hidden bg-secondary/50">
                {hero ? <SafeImg src={hero} alt={r.title} className="w-full h-full object-cover" /> : null}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{r.title}</p>
                <p className="text-[11px] text-muted-foreground truncate"><span className="font-mono">{r.listing_code}</span> · {r.type} · {images.length} photo{images.length === 1 ? "" : "s"}{r.video_url ? " · video" : ""}</p>
                <p className="md:hidden text-[11px] text-muted-foreground truncate">{[r.neighborhood, r.city, r.state].filter(Boolean).join(", ")} · ₦{Number(r.price_per_night).toLocaleString()}</p>
              </div>
              <p className="hidden md:block text-xs text-muted-foreground truncate">{[r.neighborhood, r.city, r.state].filter(Boolean).join(", ") || "—"}</p>
              <p className="hidden md:block text-xs">{r.bedrooms} / {r.bathrooms}</p>
              <p className="hidden md:block text-xs font-bold text-primary">₦{Number(r.price_per_night).toLocaleString()}</p>
              <p className="hidden md:block text-xs truncate">{host?.full_name || "Unknown host"}</p>
              <p className="hidden md:block text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
              <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                {tab === "pending" ? (
                  <>
                    <button onClick={() => setConfirmAction({ kind: "approve", row: r })} className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-success text-success-foreground">Approve</button>
                    <button onClick={() => { setRejectReason(""); setConfirmAction({ kind: "reject", row: r }); }} className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-destructive/40 text-destructive">Reject</button>
                  </>
                ) : (
                  <button onClick={() => { setRejectReason(""); setConfirmAction({ kind: "revoke", row: r }); }} className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-destructive/40 text-destructive">Revoke</button>
                )}
                <ChevronRight className={`w-4 h-4 self-center text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
              </div>
            </div>
            {isOpen && (
            <article className="m-2 rounded-3xl border border-border bg-background overflow-hidden">
              {/* Photo gallery */}
              {images.length > 0 ? (
                <div className="grid grid-cols-4 gap-1.5 p-1.5 bg-secondary/30">
                  {hero && (
                    <button
                      type="button"
                      onClick={() => setLightbox({ images, start: 0 })}
                      className="col-span-4 md:col-span-2 md:row-span-2 aspect-[4/3] md:aspect-auto md:h-full overflow-hidden rounded-2xl"
                    >
                      <SafeImg src={hero} alt={r.title} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                    </button>
                  )}
                  {rest.slice(0, 4).map((src, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setLightbox({ images, start: i + 1 })}
                      className="col-span-2 md:col-span-1 aspect-square overflow-hidden rounded-2xl relative"
                    >
                      <SafeImg src={src} alt={`${r.title} photo ${i + 2}`} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                      {i === 3 && images.length > 5 && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-sm font-bold">
                          +{images.length - 5} more
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-muted-foreground bg-secondary/30">No photos uploaded</div>
              )}

              <div className="p-5 md:p-6 space-y-5">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    {r.listing_code && (
                      <button type="button" onClick={() => { navigator.clipboard?.writeText(r.listing_code!); toast.success("Listing ID copied"); }}
                        className="mb-1 font-mono text-[11px] px-2 py-0.5 rounded-md bg-secondary text-muted-foreground hover:text-foreground">
                        {r.listing_code}
                      </button>
                    )}
                    <h2 className="text-xl md:text-2xl font-extrabold leading-tight">{r.title}</h2>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5" /> {r.address || r.location || r.city || "No address provided"}{(r.neighborhood || r.city || r.state) && <span className="text-muted-foreground"> · {[r.neighborhood, r.city, r.state].filter(Boolean).join(", ")}</span>}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-extrabold text-primary">₦{Number(r.price_per_night).toLocaleString()}</p>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">per night</p>
                  </div>
                </div>

                {/* Key specs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="rounded-xl bg-secondary/50 px-3 py-2 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-primary" />
                    <div><p className="text-[10px] text-muted-foreground">Type</p><p className="text-xs font-bold">{r.type || "—"}</p></div>
                  </div>
                  <div className="rounded-xl bg-secondary/50 px-3 py-2 flex items-center gap-2">
                    <BedDouble className="w-4 h-4 text-primary" />
                    <div><p className="text-[10px] text-muted-foreground">Bedrooms</p><p className="text-xs font-bold">{r.bedrooms}</p></div>
                  </div>
                  <div className="rounded-xl bg-secondary/50 px-3 py-2 flex items-center gap-2">
                    <Bath className="w-4 h-4 text-primary" />
                    <div><p className="text-[10px] text-muted-foreground">Bathrooms</p><p className="text-xs font-bold">{r.bathrooms}</p></div>
                  </div>
                  <div className="rounded-xl bg-secondary/50 px-3 py-2 flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-primary" />
                    <div><p className="text-[10px] text-muted-foreground">Area</p><p className="text-xs font-bold">{r.area || "—"}</p></div>
                  </div>
                </div>

                {/* Description */}
                {r.description && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold mb-1.5">Description</p>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{r.description}</p>
                  </div>
                )}

                {/* Amenities */}
                {r.amenities && r.amenities.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold mb-1.5">Amenities ({r.amenities.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {r.amenities.map((a, i) => (
                        <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-secondary border border-border">{a}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Video */}
                {r.video_url && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold mb-1.5">Walk-through video</p>
                    <video src={r.video_url} controls className="w-full rounded-2xl bg-black aspect-video" />
                  </div>
                )}

                {/* Host */}
                <div className="rounded-2xl border border-border p-3 flex items-center gap-3">
                  {host?.avatar_url ? (
                    <img src={host.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"><User2 className="w-4 h-4 text-muted-foreground" /></div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate">{host?.full_name || "Unknown host"}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                      {host?.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{host.email}</span>}
                      {host?.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{host.phone}</span>}
                    </div>
                  </div>
                  <Link to={`/admin/users/${r.host_id}`} className="text-xs font-bold text-primary shrink-0">View host</Link>
                </div>

                {/* Meta */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                  <span>Submitted {new Date(r.created_at).toLocaleString()}</span>
                  <span>{images.length} photo{images.length === 1 ? "" : "s"}</span>
                  <span>{r.video_url ? "Video included" : "No video"}</span>
                  {r.lat != null && r.lng != null && <span>Geo: {r.lat.toFixed(4)}, {r.lng.toFixed(4)}</span>}
                </div>

                {/* Actions */}
                <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1 sticky bottom-2">
                  {tab === "pending" ? (
                    <>
                      <button onClick={() => { setRejectReason(""); setConfirmAction({ kind: "reject", row: r }); }} className="flex-1 rounded-xl border border-destructive/40 text-destructive py-3 text-sm font-bold hover:bg-destructive/5">Reject</button>
                      <button onClick={() => setConfirmAction({ kind: "approve", row: r })} className="flex-1 rounded-xl bg-success text-white py-3 text-sm font-bold hover:opacity-90">Approve & publish</button>
                    </>
                  ) : (
                    <button onClick={() => { setRejectReason(""); setConfirmAction({ kind: "revoke", row: r }); }} className="flex-1 rounded-xl border border-destructive/40 text-destructive py-3 text-sm font-bold hover:bg-destructive/5">
                      Revoke approval (move to pending)
                    </button>
                  )}
                </div>
              </div>
            </article>
            )}
            </div>
          );
        })}
        </div>
        )}
        {view === "grid" && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {shown.map((r) => (
              <button key={r.id} type="button"
                onClick={() => { setView("detail"); setTimeout(() => document.getElementById(`listing-${r.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); }}
                className="text-left rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/50 transition-colors">
                <div className="aspect-[4/3] bg-secondary/40">
                  {r.images?.[0] ? <SafeImg src={r.images[0]} alt={r.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">No photo</div>}
                </div>
                <div className="p-2.5 space-y-0.5">
                  {r.listing_code && <p className="font-mono text-[10px] text-muted-foreground">{r.listing_code}</p>}
                  <p className="text-xs font-bold line-clamp-2 leading-snug">{r.title}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{[r.neighborhood, r.city, r.state].filter(Boolean).join(", ") || "No place"}</p>
                  <p className="text-xs font-extrabold text-primary">₦{Number(r.price_per_night).toLocaleString()}<span className="text-[10px] font-normal text-muted-foreground"> /night</span></p>
                  <p className="text-[10px] text-muted-foreground truncate">{hosts[r.host_id]?.full_name || "Unknown host"} · {r.images?.length || 0} photos</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {lightbox && <Lightbox images={lightbox.images} start={lightbox.start} onClose={() => setLightbox(null)} />}

      {confirmAction && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => !submitting && setConfirmAction(null)}>
          <div className="w-full max-w-md bg-card border border-border rounded-3xl shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-border">
              <h3 className="text-lg font-extrabold">
                {confirmAction.kind === "approve" ? "Approve this listing?"
                  : confirmAction.kind === "revoke" ? "Revoke approval?"
                  : "Reject this listing?"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{confirmAction.row.title}</p>
            </div>
            <div className="p-5 space-y-3">
              {confirmAction.kind === "approve" && (
                <p className="text-sm text-muted-foreground">
                  It will go live immediately and be visible to guests. Make sure photos, price, and details look right.
                </p>
              )}
              {confirmAction.kind === "revoke" && (
                <>
                  <p className="text-sm text-muted-foreground">
                    The listing will be hidden from guests and moved back to pending review. You can approve it again later.
                  </p>
                  <div>
                    <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Reason (optional)</label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={3}
                      maxLength={500}
                      placeholder="e.g. Reported issue, outdated photos, price needs review…"
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1 text-right">{rejectReason.length}/500</p>
                  </div>
                </>
              )}
              {confirmAction.kind === "reject" && (
                <>
                  <p className="text-sm text-muted-foreground">
                    The listing will be permanently removed. The host will be notified with your reason (optional).
                  </p>
                  <div>
                    <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Reason (optional)</label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={3}
                      maxLength={500}
                      placeholder="e.g. Photos are low quality, address unclear, price seems incorrect…"
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1 text-right">{rejectReason.length}/500</p>
                  </div>
                </>
              )}
            </div>
            <div className="p-4 flex gap-2 border-t border-border bg-secondary/30">
              <button
                disabled={submitting}
                onClick={() => setConfirmAction(null)}
                className="flex-1 rounded-xl border border-border bg-card py-2.5 text-sm font-bold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={submitting}
                onClick={() =>
                  confirmAction.kind === "approve"
                    ? doApprove(confirmAction.row.id)
                    : confirmAction.kind === "revoke"
                    ? doRevoke(confirmAction.row, rejectReason.trim())
                    : doReject(confirmAction.row, rejectReason.trim())
                }
                className={`flex-1 rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50 ${confirmAction.kind === "approve" ? "bg-success" : "bg-destructive"}`}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  : confirmAction.kind === "approve" ? "Approve & publish"
                  : confirmAction.kind === "revoke" ? "Revoke & move to pending"
                  : "Reject listing"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default AdminListings;
