import { TopBar } from "@/components/shell/TopBar";
import { useAuth } from "@/contexts/AuthContext";
import { hasPin, setPin, clearPin, verifyPin } from "@/lib/pin";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, ShieldOff } from "lucide-react";

const PinSettings = () => {
  const { user } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const exists = user ? hasPin(user.id) : false;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (exists) {
      if (!(await verifyPin(user.id, current))) return toast.error("Current PIN is wrong");
    }
    if (next !== confirm) return toast.error("PINs do not match");
    try {
      await setPin(user.id, next);
      toast.success(exists ? "PIN updated" : "PIN set");
      setCurrent(""); setNext(""); setConfirm("");
    } catch (err: any) { toast.error(err.message); }
  };

  const remove = async () => {
    if (!user) return;
    if (!(await verifyPin(user.id, current))) return toast.error("Current PIN is wrong");
    clearPin(user.id);
    setCurrent("");
    toast.success("PIN removed");
  };

  return (
    <>
      <TopBar title="Unlock PIN" subtitle="Local device quick-unlock" />
      <main className="px-5 pt-4 pb-8 max-w-md mx-auto">
        <div className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3 mb-4">
          {exists ? <ShieldCheck className="w-5 h-5 text-primary" /> : <ShieldOff className="w-5 h-5 text-muted-foreground" />}
          <div className="text-sm">{exists ? "PIN is set on this device" : "No PIN set"}</div>
        </div>
        <form onSubmit={save} className="space-y-3">
          {exists && (
            <input value={current} onChange={(e) => setCurrent(e.target.value.replace(/\D/g, ""))} maxLength={6} inputMode="numeric"
              placeholder="Current PIN" type="password"
              className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-sm" />
          )}
          <input value={next} onChange={(e) => setNext(e.target.value.replace(/\D/g, ""))} maxLength={6} inputMode="numeric"
            placeholder="New PIN (4–6 digits)" type="password"
            className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-sm" />
          <input value={confirm} onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))} maxLength={6} inputMode="numeric"
            placeholder="Confirm new PIN" type="password"
            className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-sm" />
          <button className="w-full rounded-xl bg-primary text-primary-foreground font-bold py-3.5 text-sm">
            {exists ? "Update PIN" : "Set PIN"}
          </button>
        </form>
        {exists && (
          <button onClick={remove}
            className="mt-3 w-full rounded-xl border border-destructive/40 bg-destructive/10 text-destructive font-bold py-3 text-sm">
            Remove PIN
          </button>
        )}
        <p className="text-[11px] text-muted-foreground text-center mt-5">
          The PIN is stored hashed on this device only. It is not a replacement for your password.
        </p>
      </main>
    </>
  );
};

export default PinSettings;
