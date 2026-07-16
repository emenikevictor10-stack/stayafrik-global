import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/contexts/AuthContext";
import { useRole, Role } from "@/contexts/RoleContext";
import { toast } from "sonner";
import icon from "@/assets/stay-logo-2.png";
import { ChevronLeft, ShieldCheck, User, Briefcase, Mail } from "lucide-react";
import { GoogleIcon } from "@/lib/google-icon";
import { Seo } from "@/components/seo/Seo";

type Mode = "signin" | "signup" | "forgot";

type PendingSignup = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: Role;
};

const PHONE_RE = /^\+?[1-9]\d{7,14}$/;

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const initialMode = (params.get("mode") as Mode) || "signin";
  const [mode, setMode] = useState<Mode>(initialMode);

  // form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [pickedRole, setPickedRole] = useState<Role>("client");
  const [loading, setLoading] = useState(false);

  // OTP step (email only)
  const [pending, setPending] = useState<PendingSignup | null>(null);
  const [emailOtp, setEmailOtp] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const { setIsNewUser, session } = useAuth();
  const { setRole } = useRole();
  const rawNext = params.get("next");
  const safeNext = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;
  const fromPath = safeNext ?? (location.state as { from?: string } | null)?.from ?? null;

  useEffect(() => {
    const routeByRole = async () => {
      if (!session?.user || pending) return;
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id).maybeSingle();
      const r = (data?.role as Role) || "client";
      setRole(r);
      if (fromPath) return navigate(fromPath, { replace: true });
      navigate(r === "agent" ? "/listings" : "/explore", { replace: true });
    };
    routeByRole();
  }, [session, navigate, setRole, fromPath, pending]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const sendEmailOtp = async (p: PendingSignup) => {
    const r = await supabase.functions.invoke("send-otp", { body: { identifier: p.email, channel: "email" } });
    if (r.error) {
      toast.error("Could not send email code");
    } else if (r.data?.dev_code) {
      toast.info(`Dev email code: ${r.data.dev_code}`, { duration: 15000 });
    }
    setResendCooldown(30);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        if (phone && !PHONE_RE.test(phone)) throw new Error("Enter a valid phone number with country code, e.g. +2348012345678");
        const p: PendingSignup = { fullName, email, phone, password, role: pickedRole };
        setPending(p);
        await sendEmailOtp(p);
        toast.success("Code sent. Check your email.");
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Password reset link sent. Check your inbox.");
        setMode("signin");
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const verifyAndFinish = async () => {
    if (!pending) return;
    setLoading(true);
    try {
      if (!emailVerified) {
        const r = await supabase.functions.invoke("verify-otp", {
          body: { identifier: pending.email, channel: "email", code: emailOtp },
        });
        if (r.error || r.data?.error) throw new Error("Email code is incorrect or expired");
        setEmailVerified(true);
      }

      // Create account
      const { data, error } = await supabase.auth.signUp({
        email: pending.email,
        password: pending.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: pending.fullName, role: pending.role, phone: pending.phone },
        },
      });
      if (error) throw error;

      const userId = data.user?.id;
      if (userId) {
        await supabase
          .from("profiles")
          .update({ phone: pending.phone || null, email_verified: true })
          .eq("user_id", userId);
      }

      setRole(pending.role);
      setIsNewUser(true);
      const newRole = pending.role;
      setPending(null);

      if (data.session) {
        toast.success("Welcome to StayGlobal!");
        navigate(newRole === "agent" ? "/become-host" : "/welcome");
      } else {
        toast.success("Account created — please sign in.");
        setMode("signin");
        setPassword("");
      }
    } catch (err: any) {
      toast.error(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const verifyEmailNow = async (code: string) => {
    if (!pending || code.length !== 6) return;
    const r = await supabase.functions.invoke("verify-otp", {
      body: { identifier: pending.email, channel: "email", code },
    });
    if (r.error || r.data?.error) {
      toast.error("Email code is incorrect");
    } else {
      setEmailVerified(true);
      toast.success("Email verified");
    }
  };

  const google = async () => {
    const redirectUri = safeNext ? `${window.location.origin}${safeNext}` : window.location.origin;
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: redirectUri });
    if (result.error) toast.error("Google sign-in failed");
  };

  // ====== OTP STEP UI ======
  if (pending) {
    return (
      <main className="min-h-screen bg-background text-foreground px-6 pt-10 pb-12 max-w-md mx-auto flex flex-col">
        <button onClick={() => setPending(null)} className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center mb-6">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center mb-7">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mb-4">
            <ShieldCheck className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-extrabold">Verify your email</h1>
          <p className="text-sm text-muted-foreground mt-2">We sent a 6-digit code to your email.</p>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Mail className="w-3.5 h-3.5" /> {pending.email}
              {emailVerified && <span className="ml-auto text-success font-bold text-[11px]">VERIFIED</span>}
            </div>
            <input
              inputMode="numeric"
              maxLength={6}
              value={emailOtp}
              disabled={emailVerified}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                setEmailOtp(v);
                if (v.length === 6 && !emailVerified) verifyEmailNow(v);
              }}
              placeholder="Enter email code"
              className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-base tracking-[0.4em] font-bold text-center disabled:opacity-60"
            />
          </div>
        </div>

        <button
          disabled={loading || !emailVerified}
          onClick={verifyAndFinish}
          className="w-full mt-6 rounded-xl bg-primary text-primary-foreground font-bold py-3.5 text-sm disabled:opacity-50"
        >
          {loading ? "Creating account…" : "Continue"}
        </button>

        <button
          disabled={resendCooldown > 0 || loading}
          onClick={() => pending && sendEmailOtp(pending)}
          className="mt-4 text-xs text-muted-foreground disabled:opacity-60"
        >
          {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
        </button>
      </main>
    );
  }

  const title = mode === "signup" ? "Join StayGlobal" : mode === "forgot" ? "Reset password" : "Welcome back";
  const sub = mode === "signup"
    ? "Create your account to book or list verified shortlets in Nigeria."
    : mode === "forgot"
      ? "We'll email you a link to set a new password."
      : "Sign in to continue.";

  return (
    <main className="min-h-screen bg-background text-foreground px-6 pt-10 pb-12 max-w-md mx-auto">
      <Seo
        title={mode === "signup" ? "Create your StayGlobal account" : mode === "forgot" ? "Reset your StayGlobal password" : "Sign in to StayGlobal"}
        description="Sign in or create an account to book verified shortlets or list properties on StayGlobal."
        noindex
      />
      <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center mb-6">
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div className="flex flex-col items-center text-center mb-7">
        <img src={icon} alt="Stay" className="h-10 w-auto mb-3" />
        <h1 className="text-2xl font-extrabold">{title}</h1>
        <p className="text-sm text-muted-foreground mt-2">{sub}</p>
      </div>

      <form onSubmit={submit} className="space-y-3">
        {mode === "signup" && (
          <>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" required
              className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              {(["client", "agent"] as Role[]).map((r) => (
                <button type="button" key={r} onClick={() => setPickedRole(r)}
                  className={`rounded-xl border py-3 text-sm font-bold inline-flex items-center justify-center gap-1.5 ${pickedRole === r ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground"}`}>
                  {r === "client" ? <><User className="w-4 h-4" /> I'm booking</> : <><Briefcase className="w-4 h-4" /> I'm an agent</>}
                </button>
              ))}
            </div>
          </>
        )}
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required
          className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-sm" />
        {mode === "signup" && (
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\s/g, ""))}
            placeholder="Phone (optional), e.g. +2348012345678"
            className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-sm"
          />
        )}
        {mode !== "forgot" && (
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 8 chars)" minLength={8} required
            className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-sm" />
        )}
        {mode === "signin" && (
          <div className="text-right">
            <button type="button" onClick={() => setMode("forgot")} className="text-xs text-primary font-semibold">
              Forgot password?
            </button>
          </div>
        )}
        <button disabled={loading} type="submit"
          className="w-full rounded-xl bg-primary text-primary-foreground font-bold py-3.5 text-sm disabled:opacity-60">
          {loading ? "Please wait…" : mode === "signup" ? "Send verification code" : mode === "forgot" ? "Send reset link" : "Sign in"}
        </button>
      </form>

      {mode !== "forgot" && (
        <>
          <div className="flex items-center gap-3 my-5 text-[11px] text-muted-foreground">
            <div className="flex-1 h-px bg-border" /> OR <div className="flex-1 h-px bg-border" />
          </div>
          <button onClick={google}
            className="w-full rounded-xl border border-border bg-card py-3.5 text-sm font-semibold flex items-center justify-center gap-2.5">
            <GoogleIcon className="w-5 h-5" /> Continue with Google
          </button>
        </>
      )}

      <p className="text-center text-xs text-muted-foreground mt-6">
        {mode === "signup" ? "Already have an account?" : mode === "forgot" ? "Remembered it?" : "New here?"}{" "}
        <button onClick={() => setMode(mode === "signup" ? "signin" : mode === "forgot" ? "signin" : "signup")} className="text-primary font-semibold">
          {mode === "signup" ? "Sign in" : mode === "forgot" ? "Sign in" : "Create one"}
        </button>
      </p>
    </main>
  );
};

export default Auth;
