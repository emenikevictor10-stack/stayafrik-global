import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Sparkles, ShieldCheck, Banknote, CheckCircle2, Home } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { Seo } from "@/components/seo/Seo";

type StepId = "intro" | "payout" | "done";
const ORDER: StepId[] = ["intro", "payout", "done"];

const BecomeHost = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { setRole } = useRole();
  const [step, setStep] = useState<StepId>("intro");
  const [busy, setBusy] = useState(false);

  // (phone verification removed from onboarding)

  // Payout step state — auto-resolves account holder from bank + account number
  type Bank = { name: string; code: string };
  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [resolving, setResolving] = useState(false);
  const [resolveErr, setResolveErr] = useState("");

  const idx = ORDER.indexOf(step);
  const pct = Math.round(((idx + 1) / ORDER.length) * 100);

  useEffect(() => {
    if (!user) navigate("/auth?mode=signin", { replace: true, state: { from: "/become-host" } });
  }, [user, navigate]);

  // Load Nigerian bank list once we reach payout step
  useEffect(() => {
    if (step !== "payout" || banks.length) return;
    supabase.functions
      .invoke("verify-bank-account", { body: { list_banks: true, account_number: "0000000000", bank_code: "x" } })
      .then(({ data }) => {
        const list = (data?.data || []).map((b: any) => ({ name: b.name, code: b.code }));
        setBanks(list);
      })
      .catch(() => {});
  }, [step, banks.length]);

  // Auto-resolve account holder name as the user fills bank + 10-digit number
  useEffect(() => {
    setAccountName("");
    setResolveErr("");
    if (!bankCode || !/^\d{10}$/.test(accountNumber)) return;
    setResolving(true);
    const t = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("verify-bank-account", {
          body: { account_number: accountNumber, bank_code: bankCode },
        });
        if (error) throw error;
        if (data?.account_name) setAccountName(data.account_name);
        else setResolveErr(data?.error || "Could not verify");
      } catch (e: any) {
        setResolveErr(e.message || "Could not verify");
      } finally {
        setResolving(false);
      }
    }, 350);
    return () => {
      clearTimeout(t);
      setResolving(false);
    };
  }, [bankCode, accountNumber]);

  const goNext = () => setStep(ORDER[Math.min(idx + 1, ORDER.length - 1)]);
  const goBack = () => (idx === 0 ? navigate(-1) : setStep(ORDER[idx - 1]));


  const savePayoutAndFinish = async () => {
    if (!user) return;
    const bankLabel = banks.find((b) => b.code === bankCode)?.name || "";
    if (!bankCode || !bankLabel || !/^\d{10}$/.test(accountNumber) || !accountName.trim()) {
      return toast.error("Pick a bank and enter a 10-digit account number");
    }
    setBusy(true);
    try {
      await supabase.from("user_roles").upsert(
        { user_id: user.id, role: "agent" },
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );
      await supabase.from("profiles").update({ is_host: true }).eq("user_id", user.id);

      await supabase.from("payment_methods").insert([{
        user_id: user.id,
        brand: bankLabel,
        bank_code: bankCode,
        last4: accountNumber.slice(-4),
        holder_name: accountName,
        is_default: true,
      }]);

      setRole("agent");
      await refreshProfile();
      setStep("done");
    } catch (e: any) {
      toast.error(e.message || "Could not save payout details");
    } finally {
      setBusy(false);
    }
  };

  const finishToListings = () => navigate("/listings", { replace: true });

  return (
    <main className="min-h-screen bg-background text-foreground max-w-md mx-auto px-6 pt-8 pb-12">
      <Seo title="Become a host on StayGlobal" description="Quick 3-step onboarding to start hosting verified shortlets." noindex />

      <div className="flex items-center justify-between mb-5">
        <button onClick={goBack} className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-bold text-muted-foreground">Step {idx + 1} of {ORDER.length}</span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden mb-7">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>

      {step === "intro" && (
        <section>
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mb-4">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-extrabold mb-2">Become a host</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Earn from your shortlet on StayGlobal. We verify every listing and protect every payment with escrow.
          </p>
          <ul className="space-y-3 mb-8">
            {[
              ["Earn ₦300k+/month", "From a single Lekki 2-bed."],
              ["Escrow-protected payouts", "Funds release 24h after check-in."],
              ["Free professional photos", "We help you list, you keep 90%."],
            ].map(([t, s]) => (
              <li key={t} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-success mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-bold">{t}</p>
                  <p className="text-xs text-muted-foreground">{s}</p>
                </div>
              </li>
            ))}
          </ul>
          <button onClick={goNext} className="w-full rounded-xl bg-primary text-primary-foreground font-bold py-3.5 text-sm">
            Get started
          </button>
        </section>
      )}


      {step === "payout" && (
        <section>
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mb-4">
            <Banknote className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-extrabold mb-2">Where should we pay you?</h1>
          <p className="text-sm text-muted-foreground mb-5">Add a Nigerian bank account for your escrow payouts.</p>

          <div className="space-y-3">
            <select
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
              className="w-full rounded-xl bg-secondary border border-border px-3 py-3 text-sm"
            >
              <option value="">{banks.length ? "Select your bank…" : "Loading banks…"}</option>
              {banks.map((b) => (
                <option key={b.code} value={b.code}>{b.name}</option>
              ))}
            </select>
            <input
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
              inputMode="numeric"
              placeholder="10-digit account number"
              className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-sm tracking-wider"
            />
            <div className={`rounded-xl border p-3 text-sm font-bold flex items-center gap-2 ${accountName ? "border-success/40 bg-success/10 text-success" : resolveErr ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-border bg-secondary text-muted-foreground"}`}>
              {resolving ? (
                <>⏳ Verifying account…</>
              ) : accountName ? (
                <>✓ {accountName}</>
              ) : resolveErr ? (
                <>⚠ {resolveErr}</>
              ) : (
                <>Account holder name appears here automatically</>
              )}
            </div>
          </div>

          <button
            disabled={busy || !accountName}
            onClick={savePayoutAndFinish}
            className="mt-6 w-full rounded-xl bg-primary text-primary-foreground font-bold py-3.5 text-sm disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save & finish"}
          </button>
        </section>
      )}

      {step === "done" && (
        <section className="text-center pt-8">
          <div className="mx-auto w-20 h-20 rounded-full bg-success/15 border border-success/30 flex items-center justify-center mb-5">
            <CheckCircle2 className="w-10 h-10 text-success" />
          </div>
          <h1 className="text-2xl font-extrabold mb-2">You're a host!</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Welcome aboard. Add your first listing and start earning with escrow-protected payouts.
          </p>
          <button onClick={finishToListings}
            className="w-full rounded-xl bg-primary text-primary-foreground font-bold py-3.5 text-sm inline-flex items-center justify-center gap-2">
            <Home className="w-4 h-4" /> Go to my listings
          </button>
        </section>
      )}
    </main>
  );
};

export default BecomeHost;
