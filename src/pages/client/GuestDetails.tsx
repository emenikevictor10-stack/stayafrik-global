import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TopBar } from "@/components/shell/TopBar";
import { Seo } from "@/components/seo/Seo";
import { Button, Notice, ListSkeleton } from "@/ui/kit";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/hooks/useSettings";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** /details — guest name, phone and (optional unless the ID switch is on) NIN last-4 or passport photo. */
const GuestDetails = () => {
  const { user } = useAuth();
  const { features } = useSettings();
  const navigate = useNavigate();
  const [qs] = useSearchParams();
  const next = qs.get("next");
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState({ name: "", phone: "+234" });
  const [kind, setKind] = useState<"nin" | "passport">("nin");
  const [nin, setNin] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [idStatus, setIdStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("profiles").select("full_name,phone").eq("user_id", user.id).maybeSingle(),
      supabase.from("kyc_submissions").select("status,id_type").eq("user_id", user.id).maybeSingle(),
    ]).then(([p, k]) => {
      setF({ name: p.data?.full_name || "", phone: p.data?.phone || "+234" });
      setIdStatus(k.data?.status ?? null);
      setLoading(false);
    });
  }, [user]);

  const save = async () => {
    if (!user) return;
    const phone = f.phone.replace(/[\s-]/g, "");
    if (f.name.trim().length < 2) return toast.error("Enter your full name");
    if (!/^\+\d{8,15}$/.test(phone)) return toast.error("Enter your phone as +234…");
    const wantsId = kind === "nin" ? nin.length > 0 : !!file;
    if (kind === "nin" && wantsId && !/^\d{4}$/.test(nin)) return toast.error("Enter the last 4 digits of your NIN");
    if (features.id_required && !idStatus && !wantsId) return toast.error("Add your ID to continue");
    setBusy(true);
    try {
      const { error } = await supabase.from("profiles").update({ full_name: f.name.trim().slice(0, 100), phone }).eq("user_id", user.id);
      if (error) throw error;
      if (wantsId) {
        let path = "";
        if (kind === "passport" && file) {
          if (file.size > 8 * 1024 * 1024) throw new Error("Photo must be under 8MB");
          path = `${user.id}/guest-passport-${Date.now()}.${(file.name.split(".").pop() || "jpg").toLowerCase().slice(0, 5)}`;
          const up = await supabase.storage.from("kyc-documents").upload(path, file, { upsert: false });
          if (up.error) throw up.error;
        }
        const { error: kErr } = await supabase.from("kyc_submissions").upsert({
          user_id: user.id, id_type: kind, id_number: kind === "nin" ? `****${nin}` : "passport", id_image_url: path, status: "pending",
        }, { onConflict: "user_id" });
        if (kErr) throw kErr;
        setIdStatus("pending");
      }
      toast.success("Details saved");
      if (next && next.startsWith("/") && !next.startsWith("//")) navigate(next);
    } catch (e) { toast.error((e as Error).message || "Couldn't save"); } finally { setBusy(false); }
  };

  return (
    <>
      <Seo title="Your details · Stay" description="Your name, phone and ID for bookings." noindex />
      <TopBar title="Your details" />
      <main className="px-4 md:px-0 py-5 max-w-[560px] mx-auto space-y-4">
        <h1 className="text-xl font-semibold">Your details</h1>
        {loading ? <ListSkeleton rows={3} /> : (
          <>
            <label className="block"><span className="text-[13px] font-semibold">Full name</span>
              <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={100} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3" /></label>
            <label className="block"><span className="text-[13px] font-semibold">Phone</span>
              <input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} inputMode="tel" maxLength={20} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3" /></label>

            <section className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-semibold">ID {features.id_required ? "(needed to book)" : "(optional)"}</h2>
                {idStatus && <span className="text-[13px] text-muted-foreground">Status: {idStatus}</span>}
              </div>
              <p className="text-[13px] text-muted-foreground">Only our team sees your ID. Hosts never get a copy.</p>
              <div className="flex gap-2">
                {(["nin", "passport"] as const).map((k) => (
                  <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k}
                    className={cn("min-h-11 px-3.5 rounded-lg border text-[13px] font-medium", kind === k ? "border-foreground bg-surface" : "border-border")}>
                    {k === "nin" ? "NIN (last 4 digits)" : "Passport photo"}
                  </button>
                ))}
              </div>
              {kind === "nin"
                ? <input value={nin} onChange={(e) => setNin(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="1234" aria-label="Last 4 digits of NIN" className="h-11 w-32 rounded-lg border border-border bg-background px-3 tracking-widest" />
                : <input type="file" accept="image/*,.pdf" aria-label="Passport photo" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-[13px]" />}
            </section>
            {features.id_required && !idStatus && <Notice tone="warn">Bookings need an ID right now. Add yours above to continue.</Notice>}
            <Button loading={busy} onClick={save}>Save details</Button>
          </>
        )}
      </main>
    </>
  );
};
export default GuestDetails;
