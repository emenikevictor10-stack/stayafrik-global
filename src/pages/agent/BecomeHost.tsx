import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Banknote, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { Seo } from "@/components/seo/Seo";

const BecomeHost = () => {
  const navigate = useNavigate();
  const { user, refreshProfile, profile } = useAuth();
  const { setRole } = useRole();
  const [busy, setBusy] = useState(false);

  type Bank = { name: string; code: string };
  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [resolving, setResolving] = useState(false);
  const [resolveErr, setResolveErr] = useState("");

  useEffect(() => {
    if (!user) navigate("/auth?mode=signin", { replace: true, state: { from: "/become-host" } });
  }, [user, navigate]);

  // If user is already a host, skip straight to listings
  useEffect(() => {
    if (profile?.is_host) {
      setRole("agent");
      navigate("/listings", { replace: true });
    }
  }, [profile?.is_host, navigate, setRole]);

  useEffect(() => {
    if (banks.length) return;
    supabase.functions
      .invoke("verify-bank-account", { body: { list_banks: true, account_number: "0000000000", bank_code: "x" } })
      .then(({ data }) => {
        const list = (data?.data || []).map((b: any) => ({ name: b.name, code: b.code }));
        setBanks(list);
      })
      .catch(() => {});
  }, [banks.length]);

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
    return () => { clearTimeout(t); setResolving(false); };
  }, [bankCode, accountNumber]);

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
      toast.success("You're a host! Add your first listing.");
      navigate("/listings", { replace: true });
    } catch (e: any) {
      toast.error(e.message || "Could not save payout details");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground max-w-md mx-auto px-6 pt-8 pb-12">
      <Seo title="Become a host on StayGlobal" description="Add your payout account and start hosting." noindex />

      <div className="flex items-center justify-between mb-5">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center">
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mb-4">
        <Banknote className="w-7 h-7 text-primary" />
      </div>
      <h1 className="text-2xl font-extrabold mb-2">Become a host</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Add a Nigerian bank account for your escrow payouts. That's it — you can start listing right after.
      </p>

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
          {resolving ? (<>⏳ Verifying account…</>) :
            accountName ? (<><CheckCircle2 className="w-4 h-4" /> {accountName}</>) :
            resolveErr ? (<>⚠ {resolveErr}</>) :
            (<>Account holder name appears here automatically</>)}
        </div>
      </div>

      <button
        disabled={busy || !accountName}
        onClick={savePayoutAndFinish}
        className="mt-6 w-full rounded-xl bg-primary text-primary-foreground font-bold py-3.5 text-sm disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save & start listing"}
      </button>
    </main>
  );
};

export default BecomeHost;
