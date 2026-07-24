import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/contexts/AuthContext";
import { useRole, Role } from "@/contexts/RoleContext";
import { toast } from "sonner";
import icon from "@/assets/stay-logo-2.png";
import { ChevronLeft, ShieldCheck, User, Briefcase } from "lucide-react";
import { GoogleIcon } from "@/lib/google-icon";
import { Seo } from "@/components/seo/Seo";
import { hasPin } from "@/lib/pin";

const ROLE_KEY = "stay:signup-role";

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  const { setIsNewUser, session } = useAuth();
  const { setRole } = useRole();
  const rawNext = params.get("next");
  const safeNext = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;
  const fromPath = safeNext ?? (location.state as { from?: string } | null)?.from ?? null;

  const [chosenRole, setChosenRole] = useState<Role>(() => {
    if (typeof window === "undefined") return "client";
    const v = window.localStorage.getItem(ROLE_KEY);
    return v === "agent" ? "agent" : "client";
  });

  useEffect(() => {
    try { window.localStorage.setItem(ROLE_KEY, chosenRole); } catch {}
  }, [chosenRole]);

  useEffect(() => {
    const routeByRole = async () => {
      if (!session?.user) return;
      const uid = session.user.id;

      if (!hasPin(uid) && localStorage.getItem(`stay:pin-prompt-skipped:${uid}`) !== "1") {
        localStorage.setItem(`stay:pin-prompt:${uid}`, "1");
      }

      const created = session.user.created_at ? new Date(session.user.created_at).getTime() : 0;
      const isFresh = Date.now() - created < 5 * 60 * 1000;

      // Apply pre-selected role for new sign-ups
      const pending = (localStorage.getItem(ROLE_KEY) as Role | null) || null;
      if (isFresh && pending === "agent") {
        await supabase.from("user_roles").upsert(
          { user_id: uid, role: "agent" },
          { onConflict: "user_id,role", ignoreDuplicates: true },
        );
        await supabase.from("profiles").update({ is_host: true }).eq("user_id", uid);
      }
      try { localStorage.removeItem(ROLE_KEY); } catch {}

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .order("role", { ascending: false })
        .limit(1)
        .maybeSingle();
      const r = (data?.role as Role) || pending || "client";
      setRole(r);

      if (isFresh) setIsNewUser(true);

      if (fromPath) return navigate(fromPath, { replace: true });
      if (isFresh) return navigate(r === "agent" ? "/become-host" : "/welcome", { replace: true });
      navigate(r === "agent" ? "/listings" : "/explore", { replace: true });
    };
    routeByRole();
  }, [session, navigate, setRole, fromPath, setIsNewUser]);

  const google = async () => {
    const redirectUri = safeNext ? `${window.location.origin}${safeNext}` : window.location.origin;
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: redirectUri });
    if (result.error) toast.error("Google sign-in failed");
  };

  return (
    <main className="min-h-screen bg-background text-foreground px-6 pt-10 pb-12 max-w-md mx-auto flex flex-col">
      <Seo
        title="Sign in to StayGlobal"
        description="Sign in with Google to book verified shortlets or list properties on StayGlobal."
        noindex
      />
      <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center mb-6">
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <img src={icon} alt="Stay" className="h-12 w-auto mb-5" />
        <h1 className="text-3xl font-extrabold tracking-tight">Welcome to StayGlobal</h1>
        <p className="text-sm text-muted-foreground mt-3 max-w-xs">
          Choose your experience, then continue with Google. Fast, secure, no passwords.
        </p>

        <div className="w-full mt-8">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-bold text-left mb-2">Choose your experience</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setChosenRole("client")}
              className={`rounded-xl border py-4 px-3 flex flex-col items-center gap-1.5 transition ${
                chosenRole === "client"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              <User className="w-5 h-5" />
              <span className="text-sm font-bold">I'm booking</span>
            </button>
            <button
              type="button"
              onClick={() => setChosenRole("agent")}
              className={`rounded-xl border py-4 px-3 flex flex-col items-center gap-1.5 transition ${
                chosenRole === "agent"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              <Briefcase className="w-5 h-5" />
              <span className="text-sm font-bold">I'm an agent</span>
            </button>
          </div>
        </div>

        <button
          onClick={google}
          className="mt-5 w-full rounded-xl border border-border bg-card py-4 text-sm font-semibold flex items-center justify-center gap-2.5 hover:bg-muted transition"
        >
          <GoogleIcon className="w-5 h-5" /> Continue with Google
        </button>

        <div className="mt-6 flex items-center gap-2 text-[11px] text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          After signing in you can set a 4-digit PIN for quick access.
        </div>

        <p className="text-[11px] text-muted-foreground mt-6 max-w-xs leading-relaxed">
          By continuing, you agree to our{" "}
          <a href="/terms" className="text-primary font-semibold">Terms</a> and{" "}
          <a href="/privacy-policy" className="text-primary font-semibold">Privacy Policy</a>.
        </p>
      </div>
    </main>
  );
};

export default Auth;
