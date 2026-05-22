import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { hasPin, isUnlocked, verifyPin, setPin as savePin, clearPin, PIN_LENGTH } from "@/lib/pin";
import { Delete, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type Mode = "verify" | "create" | "confirm" | null;

/**
 * Airbnb-style 4-digit PIN gate. Forces exactly 4 digits, custom keypad.
 */
export const PinGate = ({ children }: { children: React.ReactNode }) => {
  const { user, signOut } = useAuth();
  const [mode, setMode] = useState<Mode>(null);
  const [pin, setPin] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) { setMode(null); return; }
    const wantsCreate = localStorage.getItem(`stay:pin-prompt:${user.id}`) === "1";
    if (hasPin(user.id) && !isUnlocked(user.id)) setMode("verify");
    else if (!hasPin(user.id) && wantsCreate) setMode("create");
    else setMode(null);
  }, [user]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 450);
  };

  // Auto-submit on full PIN
  useEffect(() => {
    if (!user || !mode || pin.length !== PIN_LENGTH || busy) return;
    (async () => {
      setBusy(true);
      try {
        if (mode === "verify") {
          const ok = await verifyPin(user.id, pin);
          if (ok) { setMode(null); setPin(""); }
          else { toast.error("Wrong PIN"); triggerShake(); setPin(""); }
        } else if (mode === "create") {
          setFirstPin(pin);
          setPin("");
          setMode("confirm");
        } else if (mode === "confirm") {
          if (pin !== firstPin) {
            toast.error("PINs don't match. Start again.");
            triggerShake();
            setFirstPin("");
            setPin("");
            setMode("create");
          } else {
            await savePin(user.id, pin);
            localStorage.removeItem(`stay:pin-prompt:${user.id}`);
            toast.success("PIN set");
            setMode(null);
            setPin("");
            setFirstPin("");
          }
        }
      } catch (err: any) {
        toast.error(err.message || "Failed");
        triggerShake();
        setPin("");
      } finally {
        setBusy(false);
      }
    })();
  }, [pin, mode, user, firstPin, busy]);

  if (!user || !mode) return <>{children}</>;

  const press = (d: string) => {
    if (busy || pin.length >= PIN_LENGTH) return;
    setPin((p) => (p + d).slice(0, PIN_LENGTH));
  };
  const back = () => setPin((p) => p.slice(0, -1));

  const heading =
    mode === "verify" ? "Enter your PIN" :
    mode === "create" ? "Create a 4-digit PIN" :
    "Confirm your PIN";

  const sub =
    mode === "verify" ? "Quick unlock for this device." :
    mode === "create" ? "Pick something you'll remember. 4 digits, exactly." :
    "Type the same 4 digits again.";

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
          {mode === "verify"
            ? <Lock className="w-6 h-6 text-primary" />
            : <ShieldCheck className="w-6 h-6 text-primary" />}
        </div>
        <h1 className="text-[26px] font-semibold tracking-tight text-center leading-tight">{heading}</h1>
        <p className="text-[15px] text-muted-foreground mt-2 text-center max-w-xs">{sub}</p>

        <div className={`mt-10 flex items-center gap-4 ${shake ? "animate-[shake_0.4s]" : ""}`}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => {
            const filled = i < pin.length;
            return (
              <div
                key={i}
                className={`w-4 h-4 rounded-full transition-all ${
                  filled
                    ? "bg-foreground scale-110"
                    : "bg-transparent border-2 border-border"
                }`}
              />
            );
          })}
        </div>

        {mode === "verify" && (
          <div className="mt-8 flex items-center gap-6">
            <button
              onClick={async () => {
                if (user) clearPin(user.id);
                await signOut();
                toast.success("PIN reset. Sign in to set a new one.");
              }}
              className="text-[13px] text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Forgot PIN
            </button>
            <span className="w-px h-4 bg-border" />
            <button
              onClick={signOut}
              className="text-[13px] text-primary font-semibold underline underline-offset-4"
            >
              Continue with email
            </button>
          </div>
        )}
      </div>

      {/* Keypad — Airbnb style */}
      <div className="px-6 pb-10 pt-2 max-w-sm w-full mx-auto">
        <div className="grid grid-cols-3 gap-3">
          {["1","2","3","4","5","6","7","8","9"].map((d) => (
            <Key key={d} onClick={() => press(d)}>{d}</Key>
          ))}
          <div />
          <Key onClick={() => press("0")}>0</Key>
          <button
            onClick={back}
            aria-label="Delete"
            className="h-16 rounded-2xl flex items-center justify-center text-foreground hover:bg-muted active:bg-muted/70 transition"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-8px)}
          40%{transform:translateX(8px)}
          60%{transform:translateX(-6px)}
          80%{transform:translateX(6px)}
        }
      `}</style>
    </div>
  );
};

const Key = ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="h-16 rounded-2xl text-[26px] font-medium tracking-tight hover:bg-muted active:bg-muted/70 transition select-none"
  >
    {children}
  </button>
);
