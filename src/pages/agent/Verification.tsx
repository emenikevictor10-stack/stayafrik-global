import { TopBar } from "@/components/shell/TopBar";
import { ChevronLeft, Upload, Check, Clock, AlertCircle, IdCard, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const ID_TYPES = [
  { v: "nin", l: "National ID (NIN)" },
  { v: "passport", l: "International passport" },
  { v: "drivers_license", l: "Driver's license" },
  { v: "voter_card", l: "Voter's card" },
];

type Submission = {
  id: string;
  id_type: string;
  id_number: string;
  id_image_url: string;
  status: "pending" | "approved" | "rejected";
  reviewer_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
};

const Verification = () => {
  const { user } = useAuth();
  const fileInput = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [idType, setIdType] = useState("nin");
  const [idNumber, setIdNumber] = useState("");
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("kyc_submissions").select("*").eq("user_id", user.id).maybeSingle();
      if (data) {
        setSubmission(data as Submission);
        setIdType(data.id_type);
        setIdNumber(data.id_number);
      }
      setLoading(false);
    })();
  }, [user]);

  const upload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      if (!file.type.startsWith("image/")) throw new Error("Upload an image file");
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("kyc-documents").upload(path, file, { upsert: false });
      if (error) throw error;
      setImagePath(path);
      setImagePreview(URL.createObjectURL(file));
      toast.success("ID uploaded");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!user) return;
    if (!idNumber.trim()) return toast.error("Enter your ID number");
    if (!imagePath && !submission) return toast.error("Upload a photo of your ID");
    setSubmitting(true);
    const payload = {
      user_id: user.id,
      id_type: idType,
      id_number: idNumber.trim(),
      id_image_url: imagePath || submission?.id_image_url || "",
      status: "pending" as const,
    };
    const { error } = await supabase.from("kyc_submissions").upsert(payload, { onConflict: "user_id" });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Submitted for review");
    const { data } = await supabase.from("kyc_submissions").select("*").eq("user_id", user.id).maybeSingle();
    if (data) setSubmission(data as Submission);
  };

  const statusBadge = () => {
    if (!submission) return null;
    const map = {
      pending: { c: "bg-info/15 text-info border-info/30", I: Clock, l: "In review" },
      approved: { c: "bg-success/15 text-success border-success/30", I: Check, l: "Approved" },
      rejected: { c: "bg-destructive/15 text-destructive border-destructive/30", I: AlertCircle, l: "Rejected" },
    } as const;
    const m = map[submission.status];
    return (
      <span className={`text-xs font-bold px-2 py-1 rounded-full border flex items-center gap-1 ${m.c}`}>
        <m.I className="w-3 h-3" /> {m.l}
      </span>
    );
  };

  return (
    <>
      <TopBar title="Verification" subtitle="Basic KYC" />
      <main className="px-5 pt-4 pb-8">
        <Link to="/profile" className="inline-flex items-center gap-1 text-xs text-muted-foreground mb-4">
          <ChevronLeft className="w-3.5 h-3.5" /> Back to profile
        </Link>

        {loading ? (
          <div className="text-center py-8"><div className="w-6 h-6 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
        ) : (
          <>
            <section className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
                <IdCard className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold">Government-issued ID</div>
                <div className="text-xs text-muted-foreground">Required to host or receive payouts.</div>
              </div>
              {statusBadge()}
            </section>

            {submission?.status === "approved" ? (
              <p className="mt-4 text-sm text-success text-center">Your identity is verified.</p>
            ) : (
              <section className="mt-4 space-y-3">
                <label className="block">
                  <span className="text-xs font-semibold text-muted-foreground">ID type</span>
                  <select value={idType} onChange={(e) => setIdType(e.target.value)} className="mt-1.5 w-full rounded-xl bg-card border border-border px-3 py-3 text-sm">
                    {ID_TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-muted-foreground">ID number</span>
                  <input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="e.g. 12345678901"
                    className="mt-1.5 w-full rounded-xl bg-card border border-border px-4 py-3 text-sm" />
                </label>

                <div>
                  <span className="text-xs font-semibold text-muted-foreground">Photo of ID</span>
                  <input ref={fileInput} type="file" accept="image/*" capture="environment" hidden
                    onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                  <button onClick={() => fileInput.current?.click()} disabled={uploading}
                    className="mt-1.5 w-full aspect-video rounded-xl border-2 border-dashed border-border bg-card flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary">
                    {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : imagePreview || submission?.id_image_url ? (
                      <img src={imagePreview || ""} alt="ID" className="w-full h-full object-contain rounded-xl" />
                    ) : (
                      <>
                        <Upload className="w-6 h-6 mb-1" />
                        <span className="text-xs font-semibold">Upload front of ID</span>
                      </>
                    )}
                  </button>
                </div>

                <button onClick={submit} disabled={submitting}
                  className="w-full rounded-2xl bg-primary text-primary-foreground py-3.5 font-bold text-sm disabled:opacity-50">
                  {submitting ? "Submitting…" : submission ? "Resubmit" : "Submit for review"}
                </button>

                {submission?.status === "rejected" && submission.reviewer_notes && (
                  <p className="text-xs text-destructive">Rejected: {submission.reviewer_notes}</p>
                )}
              </section>
            )}

            <p className="text-center text-xs text-muted-foreground mt-6">
              Documents are encrypted and reviewed by our compliance team within 48h.
            </p>
          </>
        )}
      </main>
    </>
  );
};

export default Verification;
