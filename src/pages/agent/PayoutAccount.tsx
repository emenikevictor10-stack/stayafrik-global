import { TopBar } from "@/components/shell/TopBar";
import { ChevronLeft, Banknote, Plus, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Bank = { name: string; code: string };
type Account = { id: number; bank: string; bank_code: string; num: string; name: string; primary: boolean };

const PayoutAccount = () => {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([
    { id: 1, bank: "GTBank", bank_code: "058", num: "•••• 4419", name: "Emeka Ihejirika", primary: true },
  ]);
  const [adding, setAdding] = useState(false);
  const [bankCode, setBankCode] = useState("");
  const [acctNum, setAcctNum] = useState("");
  const [resolvedName, setResolvedName] = useState("");
  const [verifying, setVerifying] = useState(false);

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

  const add = () => {
    if (!resolvedName) return toast.error("Verify the account first");
    const bankName = banks.find((b) => b.code === bankCode)?.name || "Bank";
    setAccounts((a) => [...a, { id: Date.now(), bank: bankName, bank_code: bankCode, num: "•••• " + acctNum.slice(-4), name: resolvedName, primary: false }]);
    setBankCode(""); setAcctNum(""); setResolvedName("");
    setAdding(false);
    toast.success("Bank account added");
  };

  const setPrimary = (id: number) => {
    setAccounts((a) => a.map((x) => ({ ...x, primary: x.id === id })));
    toast.success("Primary account updated");
  };

  return (
    <>
      <TopBar title="Payout accounts" subtitle="Where we send your money" />
      <main className="px-5 pt-4 pb-8">
        <Link to="/profile/commission" className="inline-flex items-center gap-1 text-xs text-muted-foreground mb-4">
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </Link>

        <section className="space-y-3">
          {accounts.map((a) => (
            <div key={a.id} className={`rounded-2xl border p-4 ${a.primary ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
                  <Banknote className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold">{a.bank}</div>
                  <div className="text-[11px] text-muted-foreground">{a.num} · {a.name}</div>
                </div>
                {a.primary ? (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-primary/15 text-primary border border-primary/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Primary
                  </span>
                ) : (
                  <button onClick={() => setPrimary(a.id)} className="text-[10px] font-bold text-primary">Set primary</button>
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
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">Bank</span>
              <select value={bankCode} onChange={(e) => setBankCode(e.target.value)}
                className="mt-1.5 w-full rounded-xl bg-secondary border border-border px-3 py-3 text-sm">
                <option value="">{banks.length ? "Select bank…" : "Loading banks…"}</option>
                {banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">Account number</span>
              <input value={acctNum} onChange={(e) => setAcctNum(e.target.value.replace(/\D/g, ""))} maxLength={10} placeholder="0123456789"
                className="mt-1.5 w-full rounded-xl bg-secondary border border-border px-3 py-3 text-sm tracking-wider" />
            </label>

            {(verifying || resolvedName) && (
              <div className={`rounded-xl border p-3 text-xs flex items-center gap-2 ${resolvedName ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground"}`}>
                {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span className="font-bold">{verifying ? "Verifying…" : resolvedName}</span>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => { setAdding(false); setBankCode(""); setAcctNum(""); setResolvedName(""); }}
                className="flex-1 rounded-xl border border-border py-3 text-sm font-bold">Cancel</button>
              <button onClick={add} disabled={!resolvedName} className="flex-1 rounded-xl bg-primary text-primary-foreground py-3 text-sm font-bold disabled:opacity-50">
                Add
              </button>
            </div>
          </section>
        )}

        <p className="text-[11px] text-muted-foreground text-center mt-6">
          Account details are encrypted. Payouts arrive within 24h after escrow release.
        </p>
      </main>
    </>
  );
};

export default PayoutAccount;
