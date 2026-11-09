import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { TopBar } from "@/components/shell/TopBar";
import { Seo } from "@/components/seo/Seo";
import { Button, Notice, ListSkeleton } from "@/ui/kit";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/hooks/useSettings";
import { idAllowsPayment, idStatusLabel } from "@/lib/guest-id";
import { toast } from "sonner";

const field = "mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-base";
const safeNext = (n: string | null) => (n && n.startsWith("/") && !n.startsWith("//") ? n : null);

/** /details (name, phone, NIN last 4) and /details/passport (name, country, number, photo). */
const GuestDetails = ({ passport = false }: { passport?: boolean }) => {
  const { user } = useAuth();
  const { features } = useSettings();
  const navigate = useNavigate();
  const [qs] = useSearchParams();
  const next = safeNext(qs.get("next"));
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState({ name: "", phone: "+234" });
  const [nin, setNin] = useState("");
  const [pp, setPp] = useState({ name: "", country: "Nigeria", number: "" });
  const [file, setFile] = useState<File | null>(null);
  const [kyc, setKyc] = useState<{ status: string; id_type: string; reviewer_notes: string | null } | null>(null);
  const [resend, setResend] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    Promise.all([
      supabase.from("profiles").select("full_name,phone").eq("user_id", user.id).maybeSingle(),
      supabase.from("kyc_submissions").select("status,id_type,reviewer_notes").eq("user_id", user.id).maybeSingle(),
    ]).then(([p, k]) => {
      setF({ name: p.data?.full_name || "", phone: p.data?.phone || "+234" });
      setPp((v) => ({ ...v, name: p.data?.full_name || "" }));
      setKyc((k.data as any) || null);
      setLoading(false);
    });
  }, [user]);

  const status = kyc?.status ?? null;
  const canEditId = !status || status === "rejected" || resend;
  const locked = status === "approved";

  const submitId = async (type: "nin" | "passport", number: string, path: string, country = "", fullName = "") => {
    const { data, error } = await supabase.rpc("submit_guest_id" as any, { _type: type, _number: number, _path: path, _country: country, _full_name: fullName });
    if (error) throw error;
    setKyc({ status: String(data), id_type: type, reviewer_notes: null });
    setResend(false);
  };

  const saveDetails = async () => {
    if (!user) return;
    const phone = f.phone.replace(/[\s-]/g, "");
    if (f.name.trim().length < 2) return toast.error("Enter your full name");
    if (!/^\+\d{8,15}$/.test(phone)) return toast.error("Enter your phone as +234…");
    if (nin && !/^\d{4}$/.test(nin)) return toast.error("Enter the last 4 digits of your NIN");
    if (features.id_required && !idAllowsPayment(status, true) && !nin) return toast.error("Add your ID to continue");
    setBusy(true);
    try {
      const { error } = await supabase.from("profiles").update({ full_name: f.name.trim().slice(0, 100), phone }).eq("user_id", user.id);
      if (error) throw error;
      if (nin && canEditId && !locked) await submitId("nin", nin, "");
      toast.success("Details saved");
      if (next) navigate(next);
    } catch (e) { toast.error((e as Error).message || "Couldn't save"); } finally { setBusy(false); }
  };

  const savePassport = async () => {
    if (!user) return;
    if (pp.name.trim().length < 2 || !pp.country.trim() || pp.number.trim().length < 5 || !file) return toast.error("Add your name, country, passport number and photo");
    if (file.size > 8 * 1024 * 1024) return toast.error("Photo must be under 8MB");
    setBusy(true);
    try {
      const path = `${user.id}/guest-passport-${Date.now()}.${(file.name.split(".").pop() || "jpg").toLowerCase().slice(0, 5)}`;
      const up = await supabase.storage.from("kyc-documents").upload(path, file, { upsert: false });
      if (up.error) throw up.error;
      await submitId("passport", pp.number.trim(), path, pp.country.trim(), pp.name.trim());
      toast.success("Passport sent — we'll check it soon");
      navigate(next || "/details");
    } catch (e) { toast.error((e as Error).message || "Couldn't send"); } finally { setBusy(false); }
  };

  const nextQs = next ? `?next=${encodeURIComponent(next)}` : "";

  const statusBox = status && (
    <div className="rounded-lg bg-surface p-3 text-[13px] space-y-1">
      <p><span className="font-semibold">ID status:</span> {idStatusLabel(status)} ({kyc?.id_type === "passport" ? "passport" : "NIN"})</p>
      {status === "rejected" && kyc?.reviewer_notes && <p className="text-muted-foreground">Reason: {kyc.reviewer_notes}</p>}
      {status === "pending" && !resend && <button type="button" onClick={() => setResend(true)} className="text-primary font-medium">Send again</button>}
    </div>
  );

  return (
    <>
      <Seo title="Your details · Stay" description="Your name, phone and ID for bookings." noindex />
      <TopBar title={passport ? "Passport" : "Your details"} />
      <main className="px-4 md:px-0 py-5 max-w-[560px] mx-auto space-y-4">
        <h1 className="text-xl font-semibold">{passport ? "Add your passport" : "Your details"}</h1>
        {loading ? <ListSkeleton rows={3} /> : passport ? (
          locked ? <Notice tone="info">Your ID has already been checked. Nothing more to do.</Notice> : (
            <>
              <p className="text-[13px] text-muted-foreground">Only our team sees your passport. Hosts never get a copy.</p>
              <label className="block"><span className="text-[13px] font-semibold">Full name (as on passport)</span>
                <input value={pp.name} onChange={(e) => setPp({ ...pp, name: e.target.value })} maxLength={120} className={field} /></label>
              <label className="block"><span className="text-[13px] font-semibold">Country</span>
                <input value={pp.country} onChange={(e) => setPp({ ...pp, country: e.target.value })} maxLength={60} className={field} /></label>
              <label className="block"><span className="text-[13px] font-semibold">Passport number</span>
                <input value={pp.number} onChange={(e) => setPp({ ...pp, number: e.target.value.toUpperCase() })} maxLength={20} className={field} /></label>
              <label className="block"><span className="text-[13px] font-semibold">Photo of the photo page</span>
                <input type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="mt-1 block text-[13px]" /></label>
              <Button loading={busy} onClick={savePassport}>Send passport</Button>
              <Link to={`/details${nextQs}`} className="block text-center text-[13px] text-muted-foreground">Back</Link>
            </>
          )
        ) : (
          <>
            <label className="block"><span className="text-[13px] font-semibold">Full name</span>
              <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={100} className={field} /></label>
            <label className="block"><span className="text-[13px] font-semibold">Phone</span>
              <input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} inputMode="tel" maxLength={20} className={field} /></label>

            <section className="rounded-xl border border-border p-4 space-y-3">
              <h2 className="text-[15px] font-semibold">ID {features.id_required ? "(needed to book)" : "(optional)"}</h2>
              <p className="text-[13px] text-muted-foreground">Only our team sees your ID. Hosts never get a copy.</p>
              {statusBox}
              {canEditId && !locked && (
                <>
                  <label className="block"><span className="text-[13px] font-semibold">NIN — last 4 digits</span>
                    <input value={nin} onChange={(e) => setNin(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="1234" className="mt-1 h-11 w-32 rounded-lg border border-border bg-background px-3 tracking-widest text-base" /></label>
                  <Link to={`/details/passport${nextQs}`} className="inline-block text-[13px] font-medium text-primary">Use a passport instead</Link>
                </>
              )}
            </section>
            {features.id_required && !idAllowsPayment(status, true) && <Notice tone="warn">Bookings need an ID right now. Add yours above to continue.</Notice>}
            <Button loading={busy} onClick={saveDetails}>Save details</Button>
          </>
        )}
      </main>
    </>
  );
};
export default GuestDetails;
