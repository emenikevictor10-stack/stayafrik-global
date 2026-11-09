import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { TopBar } from "@/components/shell/TopBar";
import { Seo } from "@/components/seo/Seo";
import { Button, EmptyState, ErrorState, ListSkeleton, Notice, Tag } from "@/ui/kit";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toneFor, statusLabel } from "@/lib/status-tone";
import { tripNextStep, canCancel, canReview, canMoveDates, hasInvoice } from "@/lib/trip-next-step";
import { ReviewForm, type BookingRow } from "./Bookings";
import { toast } from "sonner";

const fmt = (n: number) => "₦" + Math.round(Number(n || 0)).toLocaleString();
const today = () => new Date().toISOString().slice(0, 10);
type Trip = BookingRow & { listing_code: string | null; fee_kobo: number | null; cleaning_fee_kobo: number | null; discount_kobo: number | null };
type Event = { id: string; type: string; created_at: string };

const useTrip = (id?: string) => {
  const [trip, setTrip] = useState<Trip | null | undefined>(undefined);
  const [events, setEvents] = useState<Event[]>([]);
  const [reviewed, setReviewed] = useState(false);
  const [err, setErr] = useState(false);
  const load = useCallback(async () => {
    if (!id) return;
    setErr(false);
    const { data, error } = await supabase.from("bookings").select("*, listings(id,title,location,city,images,address,neighborhood,state)").eq("id", id).maybeSingle();
    if (error) { setErr(true); return; }
    setTrip((data as unknown as Trip) || null);
    const [{ data: ev }, { data: rv }] = await Promise.all([
      supabase.from("booking_events").select("id,type,created_at").eq("booking_id", id).order("created_at"),
      supabase.from("reviews").select("id").eq("booking_id", id).limit(1),
    ]);
    setEvents((ev as Event[]) || []); setReviewed(!!rv?.length);
  }, [id]);
  useEffect(() => { void load(); }, [load]);
  return { trip, events, reviewed, err, load, setReviewed };
};

const titleOf = (t: Trip) => (t.source === "rayprop" ? t.partner_title : t.listings?.title) || "Stay";
const stayLink = (t: Trip) => (t.source === "rayprop" ? `/stays/rp_${t.rayprop_listing_id}` : `/stays/${t.listing_id}`);

const Shell = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <>
    <Seo title={`${title} · Stay`} description="Your trip on Stay." noindex />
    <TopBar title={title} />
    <main className="px-4 md:px-0 py-5 max-w-[760px] mx-auto">{children}</main>
  </>
);

const Gate = ({ state, err, retry, children }: { state: unknown; err: boolean; retry: () => void; children: () => React.ReactNode }) => {
  if (err) return <ErrorState message="This trip didn't load." onRetry={retry} />;
  if (state === undefined) return <ListSkeleton rows={3} />;
  if (state === null) return <EmptyState title="Trip not found" action={<Link to="/trips" className="underline">All trips</Link>} />;
  return <>{children()}</>;
};

/** /trips/:id — one trip with its next step and every action in one place. */
export const TripDetail = () => {
  const { id } = useParams();
  const { trip, events, reviewed, err, load } = useTrip(id);
  const [move, setMove] = useState({ open: false, ci: "", co: "", note: "", busy: false });
  const { user } = useAuth();
  const d = today();
  const askMove = async () => {
    if (!trip || !user) return;
    if (!move.ci || !move.co || move.co <= move.ci) return toast.error("Pick new check-in and check-out dates");
    setMove((m) => ({ ...m, busy: true }));
    const { error } = await supabase.from("booking_change_requests").insert({ booking_id: trip.id, guest_id: user.id, new_check_in: move.ci, new_check_out: move.co, note: move.note.trim().slice(0, 500) || null });
    setMove((m) => ({ ...m, busy: false, open: !!error }));
    if (error) return toast.error("Couldn't send your request");
    toast.success("Request sent. We'll check with the host and update you here.");
  };
  return (
    <Shell title="Trip">
      <Gate state={trip} err={err} retry={load}>{() => {
        const t = trip!;
        const addr = t.source === "rayprop" ? t.partner_address : t.listings?.address;
        const paid = ["confirmed", "released", "completed"].includes(t.status);
        return (
          <div className="space-y-4">
            <div>
              <Tag tone={toneFor(t.status)}>{statusLabel(t.status)}</Tag>
              <h1 className="text-xl font-semibold mt-2"><Link to={stayLink(t)} className="hover:underline">{titleOf(t)}</Link></h1>
              <p className="text-[13px] text-muted-foreground">{t.check_in_date} → {t.check_out_date}{t.listing_code ? ` · ${t.listing_code}` : ""}</p>
            </div>
            <Notice>{tripNextStep(t.status, t.check_in_date, t.check_out_date, d, reviewed)}</Notice>
            <dl className="rounded-xl border border-border divide-y divide-border text-[13px]">
              <div className="p-3 flex justify-between"><dt className="text-muted-foreground">Total paid</dt><dd className="font-semibold">{fmt(t.total_price)}</dd></div>
              {t.payment_reference && <div className="p-3 flex justify-between gap-3"><dt className="text-muted-foreground">Reference</dt><dd className="font-mono break-all">{t.payment_reference}</dd></div>}
              {t.check_in_time && <div className="p-3 flex justify-between"><dt className="text-muted-foreground">Check-in time</dt><dd>{t.check_in_time}</dd></div>}
              <div className="p-3 flex justify-between gap-3"><dt className="text-muted-foreground">Address</dt><dd className="text-right">{paid && addr ? addr : "Shown once your booking is confirmed"}</dd></div>
            </dl>
            <div className="grid gap-2 sm:grid-cols-2">
              {hasInvoice(t.status) && <Link to={`/trips/${t.id}/invoice`} className="min-h-11 rounded-lg border border-border flex items-center justify-center text-[13px] font-semibold">Invoice</Link>}
              {paid && <Link to={`/trips/${t.id}/report`} className="min-h-11 rounded-lg border border-border flex items-center justify-center text-[13px] font-semibold">Report a problem</Link>}
              {canReview(t.status, d, t.check_out_date) && !reviewed && <Link to={`/trips/${t.id}/review`} className="min-h-11 rounded-lg border border-border flex items-center justify-center text-[13px] font-semibold">Leave a review</Link>}
              {canMoveDates(t.status, d, t.check_in_date) && <button type="button" onClick={() => setMove((m) => ({ ...m, open: !m.open }))} className="min-h-11 rounded-lg border border-border text-[13px] font-semibold">Ask to move dates</button>}
              {canCancel(t.status, d, t.check_in_date) && <Link to={`/trips/${t.id}/cancel`} className="min-h-11 rounded-lg border border-destructive/40 text-destructive flex items-center justify-center text-[13px] font-semibold">Cancel booking</Link>}
            </div>
            {move.open && (
              <div className="rounded-xl border border-border p-3 space-y-2">
                <p className="text-[13px] font-semibold">New dates</p>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" aria-label="New check-in" min={d} value={move.ci} onChange={(e) => setMove({ ...move, ci: e.target.value })} className="h-11 rounded-lg border border-border bg-background px-2" />
                  <input type="date" aria-label="New check-out" min={move.ci || d} value={move.co} onChange={(e) => setMove({ ...move, co: e.target.value })} className="h-11 rounded-lg border border-border bg-background px-2" />
                </div>
                <textarea value={move.note} onChange={(e) => setMove({ ...move, note: e.target.value })} maxLength={500} rows={2} placeholder="Anything we should know? (optional)" className="w-full rounded-lg border border-border bg-background p-2 text-[13px]" />
                <Button loading={move.busy} onClick={askMove}>Send request</Button>
                <p className="text-xs text-muted-foreground">Any price difference is confirmed before anything changes.</p>
              </div>
            )}
            {events.length > 0 && (
              <section>
                <h2 className="text-[15px] font-semibold mb-2">Timeline</h2>
                <ol className="text-[13px] space-y-1">{events.map((e) => <li key={e.id} className="flex justify-between gap-3"><span>{e.type.replace(/_/g, " ")}</span><span className="text-muted-foreground">{new Date(e.created_at).toLocaleString("en-NG")}</span></li>)}</ol>
              </section>
            )}
          </div>
        );
      }}</Gate>
    </Shell>
  );
};

/** /trips/:id/cancel — shows the exact refund before the guest confirms. */
export const TripCancel = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { trip, err, load } = useTrip(id);
  const [preview, setPreview] = useState<{ amount: number; percent: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const partner = trip?.source === "rayprop";
  useEffect(() => {
    if (!trip || partner) return;
    supabase.functions.invoke("cancel-booking", { body: { booking_id: trip.id, preview: true } })
      .then(({ data }) => { if (data && typeof data.amount === "number") setPreview({ amount: data.amount, percent: data.percent }); });
  }, [trip, partner]);
  const confirm = async () => {
    if (!trip) return;
    setBusy(true);
    try {
      if (partner) {
        const { cancelRayPropBooking } = await import("@/lib/rayprop");
        await cancelRayPropBooking(trip.id);
      } else {
        const { data, error } = await supabase.functions.invoke("cancel-booking", { body: { booking_id: trip.id } });
        if (error || data?.error) throw new Error(data?.error || "Could not cancel right now");
      }
      toast.success("Booking cancelled.");
      navigate(`/trips/${trip.id}`, { replace: true });
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Shell title="Cancel booking">
      <Gate state={trip} err={err} retry={load}>{() => (
        <div className="space-y-4">
          <h1 className="text-xl font-semibold">Cancel {titleOf(trip!)}?</h1>
          {partner ? <Notice>Refunds for partner stays follow the partner's terms. We'll confirm the amount after cancelling.</Notice>
            : preview ? <Notice>You'll get back <b>{fmt(preview.amount)}</b> ({preview.percent}% of {fmt(trip!.total_price)}). Refunds take a few days to reach your bank.</Notice>
            : <ListSkeleton rows={1} />}
          <ul className="text-[13px] text-muted-foreground space-y-1">
            <li>• Full refund 48 hours or more before check-in.</li><li>• 50% refund less than 48 hours before check-in.</li><li>• No refund after check-in.</li>
          </ul>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate(-1)}>Keep booking</Button>
            <Button variant="danger" loading={busy} onClick={confirm} disabled={!partner && !preview}>Cancel booking</Button>
          </div>
        </div>
      )}</Gate>
    </Shell>
  );
};

/** /trips/:id/review */
export const TripReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { trip, reviewed, err, load } = useTrip(id);
  return (
    <Shell title="Review">
      <Gate state={trip} err={err} retry={load}>{() => reviewed
        ? <EmptyState title="Thanks — you've reviewed this stay" action={<Link to={`/trips/${id}`} className="underline">Back to trip</Link>} />
        : (<><h1 className="text-xl font-semibold">How was {titleOf(trip!)}?</h1><ReviewForm booking={trip!} onDone={() => navigate(`/trips/${id}`)} /></>)}
      </Gate>
    </Shell>
  );
};

type Invoice = { number: string; kind: string; company_name: string | null; tax_id: string | null; amount: number; lines: { label: string; kobo: number }[]; issued_at: string };

/** /trips/:id/invoice — proforma before paying, paid invoice after; print to PDF. */
export const TripInvoice = () => {
  const { id } = useParams();
  const { trip, err, load } = useTrip(id);
  const [inv, setInv] = useState<Invoice | null>(null);
  const [co, setCo] = useState({ name: "", tax: "" });
  const [busy, setBusy] = useState(false);
  const issue = useCallback(async (name = "", tax = "") => {
    if (!id) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("issue_invoice", { _booking_id: id, _company: name, _tax_id: tax });
    setBusy(false);
    if (error) return toast.error(error.message.includes("status") ? "No invoice for this booking yet" : "Couldn't make the invoice");
    setInv(data as unknown as Invoice);
  }, [id]);
  useEffect(() => { if (trip) void issue(); }, [trip, issue]);
  return (
    <Shell title="Invoice">
      <Gate state={trip} err={err} retry={load}>{() => !inv ? <ListSkeleton rows={2} /> : (
        <div className="space-y-4">
          <article className="rounded-xl border border-border p-5 print:border-0" id="invoice">
            <div className="flex justify-between gap-3">
              <div><p className="text-xl font-semibold">{inv.kind === "paid" ? "Invoice" : "Proforma invoice"}</p><p className="text-[13px] text-muted-foreground">{inv.number} · {new Date(inv.issued_at).toLocaleDateString("en-NG")}</p></div>
              <div className="text-right text-[13px]"><p className="font-semibold">StayGlobal</p><p className="text-muted-foreground">support@stayglobal.app</p></div>
            </div>
            <div className="mt-4 text-[13px]">
              <p className="text-muted-foreground">Billed to</p>
              <p className="font-semibold">{inv.company_name || "Guest"}</p>
              {inv.tax_id && <p>Tax ID: {inv.tax_id}</p>}
            </div>
            <p className="mt-4 text-[13px]">{titleOf(trip!)} · {trip!.check_in_date} → {trip!.check_out_date}{trip!.listing_code ? ` · ${trip!.listing_code}` : ""}</p>
            <table className="w-full mt-3 text-[13px]"><tbody>
              {inv.lines.map((l) => <tr key={l.label} className="border-t border-border"><td className="py-1.5">{l.label}</td><td className="py-1.5 text-right">{fmt(l.kobo / 100)}</td></tr>)}
              <tr className="border-t border-border font-semibold"><td className="py-1.5">Total</td><td className="py-1.5 text-right">{fmt(inv.amount)}</td></tr>
            </tbody></table>
            {inv.kind === "proforma" && <p className="mt-3 text-xs text-muted-foreground">Not a receipt. Becomes a paid invoice once payment is confirmed.</p>}
          </article>
          <div className="print:hidden space-y-2">
            <p className="text-[13px] font-semibold">Add company details (optional)</p>
            <div className="grid sm:grid-cols-2 gap-2">
              <input value={co.name} onChange={(e) => setCo({ ...co, name: e.target.value })} maxLength={120} placeholder="Company name" aria-label="Company name" className="h-11 rounded-lg border border-border bg-background px-3" />
              <input value={co.tax} onChange={(e) => setCo({ ...co, tax: e.target.value })} maxLength={40} placeholder="Tax ID (TIN)" aria-label="Tax ID" className="h-11 rounded-lg border border-border bg-background px-3" />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" loading={busy} onClick={() => issue(co.name, co.tax)}>Update invoice</Button>
              <Button onClick={() => window.print()}>Download PDF</Button>
            </div>
          </div>
        </div>
      )}</Gate>
    </Shell>
  );
};

/** /find-booking — look up a booking with reference + email, no sign-in. */
export const FindBooking = () => {
  const [f, setF] = useState({ ref: "", email: "" });
  const [res, setRes] = useState<{ status: string; check_in: string; check_out: string; title: string; city: string | null; listing_code: string | null } | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const go = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const { data } = await supabase.rpc("find_booking", { _reference: f.ref, _email: f.email });
    setBusy(false); setRes((data as never[])?.[0] ?? null);
  };
  return (
    <Shell title="Find my booking">
      <h1 className="text-xl font-semibold">Find my booking</h1>
      <form onSubmit={go} className="mt-4 space-y-2">
        <input required value={f.ref} onChange={(e) => setF({ ...f, ref: e.target.value })} placeholder="Payment reference" aria-label="Payment reference" maxLength={100} className="h-11 w-full rounded-lg border border-border bg-background px-3" />
        <input required type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="Email used to book" aria-label="Email" maxLength={254} className="h-11 w-full rounded-lg border border-border bg-background px-3" />
        <Button type="submit" loading={busy}>Find booking</Button>
      </form>
      {res === null && <Notice tone="warn">We couldn't find a booking with those details.</Notice>}
      {res && (
        <div className="mt-4 rounded-xl border border-border p-4 text-[13px]">
          <Tag tone={toneFor(res.status)}>{statusLabel(res.status)}</Tag>
          <p className="text-[15px] font-semibold mt-2">{res.title}{res.city ? `, ${res.city}` : ""}</p>
          <p className="text-muted-foreground">{res.check_in} → {res.check_out}{res.listing_code ? ` · ${res.listing_code}` : ""}</p>
          <Link to="/trips" className="mt-3 inline-block underline font-semibold">Sign in to manage it</Link>
        </div>
      )}
    </Shell>
  );
};
