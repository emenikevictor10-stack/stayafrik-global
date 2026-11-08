import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, ImagePlus, X } from "lucide-react";
import { TopBar } from "@/components/shell/TopBar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ISSUE_CATEGORIES, replyTargetMinutes } from "@/lib/support";
import { uploadIssuePhotos } from "@/components/support/SupportBits";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const ReportProblem = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    supabase.from("bookings").select("id,status,partner_title,listing_code,check_in_date,check_out_date,listings(title)")
      .eq("id", id).eq("guest_id", user.id).maybeSingle()
      .then(({ data }) => { setBooking(data); setLoading(false); });
  }, [id, user?.id]);

  const submit = async () => {
    if (!user || !booking) return;
    if (!category) return toast.error("Pick what the problem is about");
    if (note.trim().length < 5) return toast.error("Tell us a bit more about the problem");
    setBusy(true);
    try {
      const media = files.length ? await uploadIssuePhotos(user.id, files) : [];
      const { data, error } = await supabase.rpc("create_support_issue", {
        _booking_id: booking.id, _category: category, _urgent: urgent, _note: note.trim(), _media: media,
      });
      if (error) throw new Error(error.message);
      toast.success("Sent. We'll reply soon.");
      nav(`/issues/${data}`, { replace: true });
    } catch (e: any) {
      toast.error(e.message || "Could not send. Try again.");
    } finally { setBusy(false); }
  };

  if (loading) return (<><TopBar title="Report a problem" /><main className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></main></>);
  if (!booking) return (<><TopBar title="Report a problem" /><main className="px-4 py-10 text-center text-[15px]">We couldn't find that booking. <Link to="/bookings" className="text-primary font-semibold">Back to trips</Link></main></>);

  const title = booking.listings?.title || booking.partner_title || "Your stay";

  return (
    <>
      <TopBar title="Report a problem" />
      <main className="px-4 pt-4 pb-10 max-w-xl mx-auto space-y-5">
        <div>
          <p className="text-[15px] font-semibold">{title}</p>
          <p className="text-[13px] text-muted-foreground">{booking.check_in_date} → {booking.check_out_date}{booking.listing_code ? ` · ${booking.listing_code}` : ""}</p>
        </div>

        <section className="space-y-2">
          <h2 className="text-[15px] font-semibold">What's the problem about?</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ISSUE_CATEGORIES.map((c) => (
              <button key={c.value} type="button" onClick={() => setCategory(c.value)}
                className={cn("h-11 rounded-lg border text-[15px] transition-colors",
                  category === c.value ? "border-primary bg-primary/10 text-foreground font-semibold" : "border-border text-muted-foreground")}>
                {c.label}
              </button>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-between rounded-xl border border-border p-3">
          <div>
            <p className="text-[15px] font-semibold">It's urgent</p>
            <p className="text-[13px] text-muted-foreground">Safety, no way in, or no power or water. We aim to reply in {replyTargetMinutes(true)} min (otherwise within {replyTargetMinutes(false)} min).</p>
          </div>
          <Switch checked={urgent} onCheckedChange={setUrgent} aria-label="Urgent" />
        </section>

        <section className="space-y-2">
          <h2 className="text-[15px] font-semibold">Tell us what's happening</h2>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} rows={5}
            placeholder="For example: the generator stopped at 9pm and the inverter is off."
            className="w-full rounded-lg bg-background border border-border p-3 text-[15px]" />
        </section>

        <section className="space-y-2">
          <h2 className="text-[15px] font-semibold">Photos <span className="text-muted-foreground font-normal text-[13px]">(up to 5, optional)</span></h2>
          <div className="flex flex-wrap gap-2">
            {files.map((f, i) => (
              <div key={i} className="relative">
                <img src={URL.createObjectURL(f)} alt="" className="w-20 h-20 rounded-lg object-cover border border-border" />
                <button type="button" aria-label="Remove photo" onClick={() => setFiles(files.filter((_, j) => j !== i))}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center"><X className="w-3 h-3" /></button>
              </div>
            ))}
            {files.length < 5 && (
              <label className="w-20 h-20 rounded-lg border border-dashed border-border flex items-center justify-center cursor-pointer text-muted-foreground">
                <ImagePlus className="w-5 h-5" />
                <input type="file" accept="image/*" multiple className="hidden"
                  onChange={(e) => { const add = Array.from(e.target.files || []); setFiles([...files, ...add].slice(0, 5)); e.target.value = ""; }} />
              </label>
            )}
          </div>
        </section>

        <button onClick={submit} disabled={busy}
          className="w-full h-[46px] rounded-lg bg-primary text-primary-foreground text-[15px] font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} Send to StayGlobal
        </button>
      </main>
    </>
  );
};

export default ReportProblem;
