import { TopBar } from "@/components/shell/TopBar";
import { ChevronLeft, Banknote, Plus, CheckCircle2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

const BANKS = ["GTBank", "Access Bank", "Zenith Bank", "First Bank", "UBA", "Stanbic IBTC", "Wema Bank", "Kuda", "Opay"];

const PayoutAccount = () => {
  const nav = useNavigate();
  const [accounts, setAccounts] = useState([
    { id: 1, bank: "GTBank", num: "•••• 4419", name: "Emeka Ihejirika", primary: true },
  ]);
  const [adding, setAdding] = useState(false);
  const [bank, setBank] = useState("");
  const [acctNum, setAcctNum] = useState("");
  const [acctName, setAcctName] = useState("");

  const add = () => {
    if (!bank || !acctNum || !acctName) return toast.error("Fill all fields");
    setAccounts((a) => [...a, { id: Date.now(), bank, num: "•••• " + acctNum.slice(-4), name: acctName, primary: false }]);
    setBank(""); setAcctNum(""); setAcctName("");
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
              <select value={bank} onChange={(e) => setBank(e.target.value)}
                className="mt-1.5 w-full rounded-xl bg-secondary border border-border px-3 py-3 text-sm">
                <option value="">Select bank…</option>
                {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">Account number</span>
              <input value={acctNum} onChange={(e) => setAcctNum(e.target.value)} maxLength={10} placeholder="0123456789"
                className="mt-1.5 w-full rounded-xl bg-secondary border border-border px-3 py-3 text-sm" />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">Account name</span>
              <input value={acctName} onChange={(e) => setAcctName(e.target.value)} placeholder="As shown on your bank record"
                className="mt-1.5 w-full rounded-xl bg-secondary border border-border px-3 py-3 text-sm" />
            </label>
            <div className="flex gap-2">
              <button onClick={() => setAdding(false)} className="flex-1 rounded-xl border border-border py-3 text-sm font-bold">Cancel</button>
              <button onClick={add} className="flex-1 rounded-xl bg-primary text-primary-foreground py-3 text-sm font-bold">Add</button>
            </div>
          </section>
        )}

        <p className="text-[11px] text-muted-foreground text-center mt-6">
          🔒 Account details are encrypted. Payouts arrive within 24h after escrow release.
        </p>
      </main>
    </>
  );
};

export default PayoutAccount;
