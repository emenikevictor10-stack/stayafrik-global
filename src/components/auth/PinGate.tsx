import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { hasPin, isUnlocked, verifyPin, setPin as savePin } from "@/lib/pin";
import { ShieldCheck, Lock } from "lucide-react";
import { toast } from "sonner";

/**
 * Wraps protected routes. If the signed-in user has a PIN set and the
 * tab hasn't been unlocked yet, blocks the UI with a PIN keypad.
 * If they signed up with `?setpin=1` flag in localStorage, prompts to create one first time.
 */
export const PinGate = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [pin, setPin] = useState("");
  const [mode, setMode] = useState<"verify" | "create" | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) { setMode(null); return; }
    const wantsCreate = localStorage.getItem(`stay:pin-prompt:${user.id}`) === "1";
    if (hasPin(user.id) && !isUnlocked(user.id)) setMode("verify");
    else if (!hasPin(user.id) && wantsCreate) setMode("create");
    else setMode(null);
  }, [user]);

  useEffect(() => { if (mode) inputRef.current?.focus(); }, [mode]);

  if (!user || !mode) return <>{children}</>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "create") {
        await savePin(user.id, pin);
        localStorage.removeItem(`stay:pin-prompt:${user.id}`);
        toast.success("PIN set");
        setMode(null);
      } else {
        const ok = await verifyPin(user.id, pin);
        if (!ok) { toast.error("Wrong PIN"); setPin(""); }
        else setMode(null);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-6">
      <div className="w-16 h-16 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mb-5">
        {mode === "create" ? <ShieldCheck className="w-8 h-8 text-primary" /> : <Lock className="w-8 h-8 text-primary" />}
      </div>
      <h1 className="text-2xl font-extrabold mb-1">{mode === "create" ? "Set your PIN" : "Enter your PIN"}</h1>
      <p className="text-sm text-muted-foreground mb-6 text-center">
        {mode === "create" ? "Pick a 4–6 digit PIN to unlock Stay quickly." : "Quick unlock for this device."}
      </p>
      <form onSubmit={submit} className="w-full max-w-xs">
        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          pattern="\d*"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          className="w-full text-center text-3xl tracking-[0.6em] font-bold rounded-2xl bg-card border border-border py-4"
          placeholder="••••"
        />
        <button disabled={busy || pin.length < 4} type="submit"
          className="mt-4 w-full rounded-xl bg-primary text-primary-foreground font-bold py-3.5 text-sm disabled:opacity-60">
          {busy ? "Please wait…" : mode === "create" ? "Save PIN" : "Unlock"}
        </button>
      </form>
    </div>
  );
};
