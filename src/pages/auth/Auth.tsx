import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/contexts/AuthContext";
import { useRole, Role } from "@/contexts/RoleContext";
import { toast } from "sonner";
import icon from "@/assets/stay-icon.png";
import { ChevronLeft, MailCheck } from "lucide-react";
import { GoogleIcon } from "@/lib/google-icon";

type Mode = "signin" | "signup" | "forgot";

const Auth = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialMode = (params.get("mode") as Mode) || "signin";
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [pickedRole, setPickedRole] = useState<Role>("client");
  const [loading, setLoading] = useState(false);
  const [pendingVerify, setPendingVerify] = useState<string | null>(null);
  const { setIsNewUser, session } = useAuth();
  const { setRole } = useRole();

  // If already signed in, route by role
  useEffect(() => {
    const routeByRole = async () => {
      if (!session?.user) return;
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id).maybeSingle();
      const r = (data?.role as Role) || "client";
      setRole(r);
      const onboarded = localStorage.getItem(`stay:onboarded:${session.user.id}`) === "1";
      if (!onboarded) return navigate("/welcome", { replace: true });
      navigate(r === "agent" ? "/listings" : "/explore", { replace: true });
    };
    routeByRole();
  }, [session, navigate, setRole]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: fullName, role: pickedRole },
          },
        });
        if (error) throw error;
        setRole(pickedRole);
        setIsNewUser(true);
        if (!data.session) {
          // Email confirmation required
          setPendingVerify(email);
          toast.success("Check your inbox to verify your email.");
        } else {
          toast.success("Welcome to Stay!");
          navigate("/welcome");
        }
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (/confirm/i.test(error.message) || /not confirmed/i.test(error.message)) {
            setPendingVerify(email);
            throw new Error("Please verify your email first. We just resent the link.");
          }
          throw error;
        }
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

  const resendVerification = async () => {
    if (!pendingVerify) return;
    const { error } = await supabase.auth.resend({ type: "signup", email: pendingVerify });
    if (error) toast.error(error.message);
    else toast.success("Verification email resent");
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) toast.error("Google sign-in failed");
  };

  if (pendingVerify) {
    return (
      <main className="min-h-screen bg-background text-foreground px-6 pt-10 pb-12 max-w-md mx-auto flex flex-col">
        <button onClick={() => setPendingVerify(null)} className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center mb-6">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 flex flex-col justify-center text-center">
          <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mb-5">
            <MailCheck className="w-9 h-9 text-primary" />
          </div>
          <h1 className="text-2xl font-extrabold mb-2">Verify your email</h1>
          <p className="text-sm text-muted-foreground mb-1">We sent a confirmation link to</p>
          <p className="text-sm font-semibold mb-7">{pendingVerify}</p>
          <button onClick={resendVerification} className="w-full rounded-xl bg-primary text-primary-foreground font-bold py-3.5 text-sm">
            Resend email
          </button>
          <button onClick={() => { setPendingVerify(null); setMode("signin"); }} className="mt-3 text-xs text-muted-foreground">
            Back to sign in
          </button>
        </div>
      </main>
    );
  }

  const title = mode === "signup" ? "Join Stay" : mode === "forgot" ? "Reset password" : "Welcome back";
  const sub = mode === "signup"
    ? "Create your account to book or list verified African properties."
    : mode === "forgot"
      ? "We'll email you a link to set a new password."
      : "Sign in to continue.";

  return (
    <main className="min-h-screen bg-background text-foreground px-6 pt-10 pb-12 max-w-md mx-auto">
      <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center mb-6">
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-3 mb-2">
        <img src={icon} alt="Stay" className="h-10 w-10 rounded-lg" />
        <h1 className="text-2xl font-extrabold">{title}</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-7">{sub}</p>

      <form onSubmit={submit} className="space-y-3">
        {mode === "signup" && (
          <>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" required
              className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              {(["client", "agent"] as Role[]).map((r) => (
                <button type="button" key={r} onClick={() => setPickedRole(r)}
                  className={`rounded-xl border py-3 text-sm font-bold ${pickedRole === r ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground"}`}>
                  {r === "client" ? "👤 I'm booking" : "🧑‍💼 I'm an agent"}
                </button>
              ))}
            </div>
          </>
        )}
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required
          className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-sm" />
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
          {loading ? "Please wait…" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
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
