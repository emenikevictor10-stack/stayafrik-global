import { useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/contexts/AuthContext";
import { useRole, Role } from "@/contexts/RoleContext";
import { toast } from "sonner";
import icon from "@/assets/stay-logo-2.png";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import { GoogleIcon } from "@/lib/google-icon";
import { Seo } from "@/components/seo/Seo";
import { hasPin } from "@/lib/pin";

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  const { setIsNewUser, session } = useAuth();
  const { setRole } = useRole();
  const rawNext = params.get("next");
  const safeNext = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;
  const fromPath = safeNext ?? (location.state as { from?: string } | null)?.from ?? null;

  useEffect(() => {
    const routeByRole = async () => {
      if (!session?.user) return;
      const uid = session.user.id;

      // Prompt to create a PIN on first sign-in if none exists yet on this device.
      if (!hasPin(uid) && localStorage.getItem(`stay:pin-prompt-skipped:${uid}`) !== "1") {
        localStorage.setItem(`stay:pin-prompt:${uid}`, "1");
      }

      const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid).maybeSingle();
      const r = (data?.role as Role) || "client";
      setRole(r);

      // Flag new users (no profile yet is a fair signal, but the trigger creates one — use metadata timestamp)
      const created = session.user.created_at ? new Date(session.user.created_at).getTime() : 0;
      const isFresh = Date.now() - created < 5 * 60 * 1000;
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
          Sign in with Google to book verified shortlets or list your property. Fast, secure, no passwords.
        </p>

        <button
          onClick={google}
          className="mt-8 w-full rounded-xl border border-border bg-card py-4 text-sm font-semibold flex items-center justify-center gap-2.5 hover:bg-muted transition"
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
