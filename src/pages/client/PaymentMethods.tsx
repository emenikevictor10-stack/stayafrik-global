import { Tag } from "@/ui/kit";
import { TopBar } from "@/components/shell/TopBar";
import { ChevronLeft, CreditCard, Plus, CheckCircle2, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Method = {
  id: string;
  user_id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  holder_name: string | null;
  is_default: boolean;
};

const detectBrand = (num: string): string => {
  const n = num.replace(/\s/g, "");
  if (/^4/.test(n)) return "Visa";
  if (/^5[1-5]/.test(n)) return "Mastercard";
  if (/^3[47]/.test(n)) return "Amex";
  if (/^5061|^5078|^6500/.test(n)) return "Verve";
  return "Card";
};

const PaymentMethods = () => {
  const { user } = useAuth();
  const [methods, setMethods] = useState<Method[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [num, setNum] = useState("");
  const [name, setName] = useState("");
  const [exp, setExp] = useState("");
  const [cvc, setCvc] = useState("");

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("payment_methods").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setMethods((data as Method[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const add = async () => {
    if (!user) return;
    const cleanNum = num.replace(/\s/g, "");
    if (cleanNum.length < 13) return toast.error("Enter a valid card number");
    if (!/^\d{2}\/\d{2}$/.test(exp)) return toast.error("Expiry must be MM/YY");
    if (cvc.length < 3) return toast.error("CVC required");
    const [mm, yy] = exp.split("/");
    const { error } = await supabase.from("payment_methods").insert({
      user_id: user.id,
      brand: detectBrand(cleanNum),
      last4: cleanNum.slice(-4),
      exp_month: Number(mm),
      exp_year: 2000 + Number(yy),
      holder_name: name,
      is_default: methods.length === 0,
    });
    if (error) return toast.error(error.message);
    toast.success("Card added");
    setAdding(false); setNum(""); setName(""); setExp(""); setCvc("");
    load();
  };

  const setDefault = async (id: string) => {
    if (!user) return;
    await supabase.from("payment_methods").update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("payment_methods").update({ is_default: true }).eq("id", id);
    toast.success("Default updated");
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("payment_methods").delete().eq("id", id);
    toast.success("Removed");
    load();
  };

  return (
    <>
      <TopBar title="Payment methods" subtitle="Cards and wallets" />
      <main className="px-5 pt-4 pb-8">
        <Link to="/account" className="inline-flex items-center gap-1 text-xs text-muted-foreground mb-4">
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </Link>

        {loading ? (
          <div className="text-center py-8"><div className="w-6 h-6 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
        ) : methods.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No payment methods saved</p>
          </div>
        ) : (
          <section className="space-y-3">
            {methods.map((m) => (
              <div key={m.id} className={`rounded-2xl border p-4 ${m.is_default ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold">{m.brand} •••• {m.last4}</div>
                    <div className="text-xs text-muted-foreground">
                      Exp {String(m.exp_month).padStart(2, "0")}/{String(m.exp_year).slice(-2)}{m.holder_name ? ` · ${m.holder_name}` : ""}
                    </div>
                  </div>
                  {m.is_default ? (
                    <Tag tone="done">Default</Tag>
                  ) : (
                    <button onClick={() => setDefault(m.id)} className="text-xs font-bold text-primary">Set default</button>
                  )}
                </div>
                <button onClick={() => remove(m.id)} className="mt-3 text-xs text-destructive inline-flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Remove
                </button>
              </div>
            ))}
          </section>
        )}

        {!adding ? (
          <button onClick={() => setAdding(true)}
            className="mt-4 w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card py-4 text-sm font-bold text-muted-foreground hover:border-primary hover:text-primary">
            <Plus className="w-4 h-4" /> Add a card
          </button>
        ) : (
          <section className="mt-4 rounded-2xl bg-card border border-border p-4 space-y-3">
            <h3 className="text-sm font-bold">New card</h3>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">Card number</span>
              <input value={num} onChange={(e) => setNum(e.target.value.replace(/[^\d ]/g, ""))} inputMode="numeric" placeholder="4111 1111 1111 1111"
                className="mt-1.5 w-full rounded-xl bg-secondary border border-border px-3 py-3 text-sm" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">Cardholder name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name on card"
                className="mt-1.5 w-full rounded-xl bg-secondary border border-border px-3 py-3 text-sm" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-xs font-semibold text-muted-foreground">Expiry MM/YY</span>
                <input value={exp} onChange={(e) => setExp(e.target.value)} placeholder="12/27"
                  className="mt-1.5 w-full rounded-xl bg-secondary border border-border px-3 py-3 text-sm" />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-muted-foreground">CVC</span>
                <input value={cvc} onChange={(e) => setCvc(e.target.value)} inputMode="numeric" maxLength={4} placeholder="123"
                  className="mt-1.5 w-full rounded-xl bg-secondary border border-border px-3 py-3 text-sm" />
              </label>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setAdding(false)} className="flex-1 rounded-xl border border-border py-3 text-sm font-bold">Cancel</button>
              <button onClick={add} className="flex-1 rounded-xl bg-primary text-primary-foreground py-3 text-sm font-bold">Save card</button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Cards are saved locally for v1. Real charges will be enabled in v2.
            </p>
          </section>
        )}
      </main>
    </>
  );
};

export default PaymentMethods;
