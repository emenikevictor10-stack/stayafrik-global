import { useEffect, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import { ShieldCheck, Mail, LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const STORAGE_KEY = "admin:2fa-token";

export const AdminTwoFactor = () => {
  const { session, user, signOut } = useAuth();
  const email = user?.email ?? "";
  const token = session?.access_token ?? "";

  const [verified, setVerified] = useState(false);
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const sentRef = useRef(false);

  // Sync verified state with current access_token
  useEffect(() => {
    if (!token) { setVerified(false); return; }
    setVerified(sessionStorage.getItem(STORAGE_KEY) === token);
  }, [token]);

  const LAST_SENT_KEY = "admin:2fa-last-sent";

  const sendCode = async (auto = false) => {
    if (!email) return;
    // Client-side cooldown guard (survives StrictMode remounts)
    const last = Number(sessionStorage.getItem(LAST_SENT_KEY) || 0);
    const elapsed = Date.now() - last;
    if (elapsed < 30_000) {
      const remaining = Math.ceil((30_000 - elapsed) / 1000);
      setCooldown(remaining);
      if (!auto) toast.info(`Please wait ${remaining}s before requesting a new code`);
      return;
    }
    setSending(true);
    try {
      const r = await supabase.functions.invoke("send-otp", { body: { identifier: email, channel: "email" } });
      const retryMs = (r.data as any)?.retry_in_ms ?? (r.error as any)?.context?.retry_in_ms;
      if (retryMs) {
        const s = Math.ceil(retryMs / 1000);
        setCooldown(s);
        sessionStorage.setItem(LAST_SENT_KEY, String(Date.now() - (30_000 - retryMs)));
        if (!auto) toast.info(`A code was just sent. Try again in ${s}s`);
        return;
      }
      if (r.error) throw new Error("Could not send code");
      sessionStorage.setItem(LAST_SENT_KEY, String(Date.now()));
      if (r.data?.dev_code) toast.info(`Dev code: ${r.data.dev_code}`, { duration: 15000 });
      else toast.success("Code sent. Check your email.");
      setCooldown(30);
    } catch (e: any) {
      if (!auto) toast.error(e.message || "Failed to send code");
    } finally {
      setSending(false);
    }
  };

  // Send code once per mount when not verified
  useEffect(() => {
    if (!verified && email && !sentRef.current) {
      sentRef.current = true;
      sendCode(true);
    }
  }, [verified, email]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const verify = async (value: string) => {
    if (value.length !== 6 || !email || !token) return;
    setVerifying(true);
    try {
      const r = await supabase.functions.invoke("verify-otp", {
        body: { identifier: email, channel: "email", code: value },
      });
      if (r.error || r.data?.error) throw new Error("Code is incorrect or expired");
      sessionStorage.setItem(STORAGE_KEY, token);
      setVerified(true);
      toast.success("Admin verified");
    } catch (e: any) {
      toast.error(e.message || "Verification failed");
      setCode("");
    } finally {
      setVerifying(false);
    }
  };

  if (verified) return <Outlet />;

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-7 shadow-sm">
        <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mb-5">
          <ShieldCheck className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-xl font-extrabold text-center">Admin verification</h1>
        <p className="text-sm text-muted-foreground text-center mt-1.5">
          Enter the 6-digit code sent to your email to access the admin console.
        </p>

        <div className="mt-5 rounded-xl border border-border bg-secondary/40 p-3.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Mail className="w-3.5 h-3.5" /> {email || "—"}
          </div>
          <input
            inputMode="numeric"
            maxLength={6}
            autoFocus
            value={code}
            disabled={verifying}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 6);
              setCode(v);
              if (v.length === 6) verify(v);
            }}
            placeholder="000000"
            className="w-full rounded-xl bg-background border border-border px-4 py-3 text-lg tracking-[0.5em] font-bold text-center disabled:opacity-60"
          />
        </div>

        <div className="flex items-center justify-between mt-4 text-xs">
          <button
            disabled={cooldown > 0 || sending}
            onClick={sendCode}
            className="text-primary font-semibold disabled:opacity-50"
          >
            {sending ? "Sending…" : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
          </button>
          <button onClick={signOut} className="text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </div>
    </main>
  );
};
