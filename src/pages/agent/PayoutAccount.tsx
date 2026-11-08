import { TopBar } from "@/components/shell/TopBar";
import { ChevronLeft, Banknote, Plus, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Bank = { name: string; code: string };
type Account = { id: string; bank: string; bank_code: string; num: string; name: string; primary: boolean };

const PayoutAccount = () => {
  const { user } = useAuth();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [adding, setAdding] = useState(false);
  const [bankCode, setBankCode] = useState("");
  const [acctNum, setAcctNum] = useState("");
  const [resolvedName, setResolvedName] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setBankCode("");
    setAcctNum("");
    setResolvedName("");
  };

  const loadAccounts = async () => {
    if (!user) return;
    setLoadingAccounts(true);
    try {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("id, brand, bank_code, last4, holder_name, is_default")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAccounts((data || []).map((method) => ({
        id: method.id,
        bank: method.brand,
        bank_code: method.bank_code || "",
        num: "•••• " + method.last4,
        name: method.holder_name || "Account holder",
        primary: method.is_default,
      })));
    } catch (err: any) {
      toast.error(err.message || "Could not load payout accounts");
    } finally {
      setLoadingAccounts(false);
    }
  };

  useEffect(() => {
    if (user) loadAccounts();
  }, [user]);

  useEffect(() => {
    if (!adding || banks.length) return;
    supabase.functions.invoke("verify-bank-account", { body: { list_banks: true, account_number: "0000000000", bank_code: "x" } })
      .then(({ data }) => {
        const list = (data?.data || []).map((b: any) => ({ name: b.name, code: b.code }));
        setBanks(list);
      }).catch(() => { /* fallback list unused */ });
  }, [adding, banks.length]);

  // Auto-verify when bank + 10-digit number entered
  useEffect(() => {
    setResolvedName("");
    if (!bankCode || !/^\d{10}$/.test(acctNum)) return;
    setVerifying(true);
    const t = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("verify-bank-account", {
          body: { account_number: acctNum, bank_code: bankCode },
        });
        if (error) throw error;
        if (data?.account_name) {
          setResolvedName(data.account_name);
        } else if (data?.error) {
          toast.error(data.error);
        }
      } catch (err: any) {
        toast.error(err.message || "Could not verify account");
      } finally { setVerifying(false); }
    }, 300);
    return () => { clearTimeout(t); setVerifying(false); };
  }, [bankCode, acctNum]);

  const add = async () => {
    if (!user) return toast.error("Please sign in again");
    if (!resolvedName) return toast.error("Verify the account first");
    const bankName = banks.find((b) => b.code === bankCode)?.name || "Bank";
    setSaving(true);
    try {
      const shouldBePrimary = accounts.length === 0;
      if (shouldBePrimary) {
        await supabase.from("payment_methods").update({ is_default: false }).eq("user_id", user.id);
      }

      const { error } = await supabase.from("payment_methods").insert({
        user_id: user.id,
        brand: bankName,
        bank_code: bankCode,
        last4: acctNum.slice(-4),
        holder_name: resolvedName,
        is_default: shouldBePrimary,
      });

      if (error) throw error;
      resetForm();
      setAdding(false);
      await loadAccounts();
      toast.success("Bank account saved");
    } catch (err: any) {
      toast.error(err.message || "Could not save bank account");
    } finally {
      setSaving(false);
    }
  };

  const setPrimary = async (id: string) => {
    if (!user) return toast.error("Please sign in again");
    setSaving(true);
    try {
      const { error: clearError } = await supabase.from("payment_methods").update({ is_default: false }).eq("user_id", user.id);
      if (clearError) throw clearError;
      const { error } = await supabase.from("payment_methods").update({ is_default: true }).eq("id", id).eq("user_id", user.id);
      if (error) throw error;
      setAccounts((a) => a.map((x) => ({ ...x, primary: x.id === id })));
      toast.success("Primary account saved");
    } catch (err: any) {
      toast.error(err.message || "Could not update primary account");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <TopBar title="Payout accounts" subtitle="Where we send your money" />
      <main className="px-5 pt-4 pb-8">
        <Link to="/profile/commission" className="inline-flex items-center gap-1 text-xs text-muted-foreground mb-4">
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </Link>

        <section className="space-y-3">
          {loadingAccounts ? (
            <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading saved accounts…
            </div>
          ) : accounts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-5 text-center">
              <Banknote className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-bold">No payout account yet</p>
              <p className="text-xs text-muted-foreground mt-1">Add a verified bank account to receive escrow payouts.</p>
            </div>
          ) : accounts.map((a) => (
            <div key={a.id} className={`rounded-2xl border p-4 ${a.primary ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
                  <Banknote className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold">{a.bank}</div>
                  <div className="text-xs text-muted-foreground">{a.num} · {a.name}</div>
                </div>
                {a.primary ? (
                  <span className="text-xs font-bold px-2 py-1 rounded-full bg-primary/15 text-primary border border-primary/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Primary
                  </span>
                ) : (
                  <button disabled={saving} onClick={() => setPrimary(a.id)} className="text-xs font-bold text-primary disabled:opacity-50">Set primary</button>
                )}
              </div>
            </div>
          ))}
        </section>

        {!adding ? (
          <button onClick={() => setAdding(true)}
            className="mt-4 w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card py-4 text-sm font-bold text-muted-foreground hover:border-primary hover:text-primary">
            <Plus className="w-4 h-4" /> Add another bank account
          </button>
        ) : (
          <section className="mt-4 rounded-2xl bg-card border border-border p-4 space-y-3">
            <h3 className="text-sm font-bold">New bank account</h3>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">Bank</span>
              <select value={bankCode} onChange={(e) => setBankCode(e.target.value)}
                className="mt-1.5 w-full rounded-xl bg-secondary border border-border px-3 py-3 text-sm">
                <option value="">{banks.length ? "Select bank…" : "Loading banks…"}</option>
                {banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">Account number</span>
              <input value={acctNum} onChange={(e) => setAcctNum(e.target.value.replace(/\D/g, ""))} maxLength={10} placeholder="0123456789"
                className="mt-1.5 w-full rounded-xl bg-secondary border border-border px-3 py-3 text-sm" />
            </label>

            {(verifying || resolvedName) && (
              <div className={`rounded-xl border p-3 text-xs flex items-center gap-2 ${resolvedName ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground"}`}>
                {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span className="font-bold">{verifying ? "Verifying…" : resolvedName}</span>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => { setAdding(false); resetForm(); }} disabled={saving}
                className="flex-1 rounded-xl border border-border py-3 text-sm font-bold disabled:opacity-50">Cancel</button>
              <button onClick={add} disabled={!resolvedName || saving} className="flex-1 rounded-xl bg-primary text-primary-foreground py-3 text-sm font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? "Saving…" : "Save account"}
              </button>
            </div>
          </section>
        )}

        <p className="text-xs text-muted-foreground text-center mt-6">
          Account details are encrypted. Payouts arrive within 24h after escrow release.
        </p>
      </main>
    </>
  );
};

export default PayoutAccount;
