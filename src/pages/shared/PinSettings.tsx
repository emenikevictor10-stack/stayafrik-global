import { TopBar } from "@/components/shell/TopBar";
import { useAuth } from "@/contexts/AuthContext";
import { hasPin, setPin, clearPin, verifyPin, PIN_LENGTH } from "@/lib/pin";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PinInput = ({
  value, onChange, label, autoFocus,
}: { value: string; onChange: (v: string) => void; label: string; autoFocus?: boolean }) => (
  <label className="block">
    <span className="text-xs font-semibold text-muted-foreground tracking-wide">{label}</span>
    <input
      autoFocus={autoFocus}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH))}
      inputMode="numeric"
      pattern="\d*"
      maxLength={PIN_LENGTH}
      type="password"
      placeholder={"•".repeat(PIN_LENGTH)}
      className="mt-1.5 w-full rounded-2xl bg-secondary border border-border px-4 py-4 text-center text-2xl font-bold"
    />
  </label>
);

const PinSettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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
    if (next.length !== PIN_LENGTH) return toast.error(`PIN must be exactly ${PIN_LENGTH} digits`);
    if (next !== confirm) return toast.error("PINs do not match");
    try {
      await setPin(user.id, next);
      setCurrent(""); setNext(""); setConfirm("");
      if (exists) {
        toast.success("PIN updated");
      } else {
        toast.success("PIN set! 🎉 You're all secure. Taking you to explore…", { duration: 3000 });
        navigate("/explore", { replace: true });
      }
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
      <TopBar title="Unlock PIN" subtitle="4-digit quick unlock" />
      <main className="px-5 pt-4 pb-8 max-w-md md:max-w-xl mx-auto">
        <div className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3 mb-5">
          {exists
            ? <ShieldCheck className="w-5 h-5 text-primary" />
            : <ShieldOff className="w-5 h-5 text-muted-foreground" />}
          <div className="text-sm">{exists ? "PIN is set on this device" : "No PIN set"}</div>
        </div>

        <form onSubmit={save} className="space-y-4">
          {exists && (
            <PinInput value={current} onChange={setCurrent} label="Current PIN" autoFocus />
          )}
          <PinInput value={next} onChange={setNext} label="New 4-digit PIN" autoFocus={!exists} />
          <PinInput value={confirm} onChange={setConfirm} label="Confirm new PIN" />
          <button className="w-full rounded-2xl bg-primary text-primary-foreground font-bold py-4 text-sm">
            {exists ? "Update PIN" : "Set PIN"}
          </button>
        </form>

        {exists && (
          <button onClick={remove}
            className="mt-3 w-full rounded-2xl border border-destructive/40 bg-destructive/10 text-destructive font-bold py-3 text-sm">
            Remove PIN
          </button>
        )}
        <p className="text-xs text-muted-foreground text-center mt-6 leading-relaxed">
          Your PIN is stored hashed on this device only. It's a quick unlock — not a replacement for your password.
        </p>
      </main>
    </>
  );
};

export default PinSettings;
