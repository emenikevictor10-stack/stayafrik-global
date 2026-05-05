import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/contexts/AuthContext";
import { useRole, Role } from "@/contexts/RoleContext";
import { toast } from "sonner";
import icon from "@/assets/stay-icon.png";
import { ChevronLeft } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialMode = (params.get("mode") as "signin" | "signup") || "signin";
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [pickedRole, setPickedRole] = useState<Role>("client");
  const [loading, setLoading] = useState(false);
  const { setIsNewUser } = useAuth();
  const { setRole } = useRole();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
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
        toast.success("Welcome to Stay!");
        navigate("/welcome");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
        navigate("/");
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) toast.error("Google sign-in failed");
  };

  return (
    <main className="min-h-screen bg-background text-foreground px-6 pt-10 pb-12 max-w-md mx-auto">
      <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center mb-6">
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-3 mb-2">
        <img src={icon} alt="Stay" className="h-10 w-10 rounded-lg" />
        <h1 className="text-2xl font-extrabold">{mode === "signup" ? "Join Stay" : "Welcome back"}</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-7">
        {mode === "signup" ? "Create your account to book or list verified African properties." : "Sign in to continue."}
      </p>

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
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 8 chars)" minLength={8} required
          className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-sm" />
        <button disabled={loading} type="submit"
          className="w-full rounded-xl bg-primary text-primary-foreground font-bold py-3.5 text-sm disabled:opacity-60">
          {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </form>

      <div className="flex items-center gap-3 my-5 text-[11px] text-muted-foreground">
        <div className="flex-1 h-px bg-border" /> OR <div className="flex-1 h-px bg-border" />
      </div>

      <button onClick={google}
        className="w-full rounded-xl border border-border bg-card py-3.5 text-sm font-semibold flex items-center justify-center gap-2">
        <span className="text-base">🌐</span> Continue with Google
      </button>

      <p className="text-center text-xs text-muted-foreground mt-6">
        {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
        <button onClick={() => setMode(mode === "signup" ? "signin" : "signup")} className="text-primary font-semibold">
          {mode === "signup" ? "Sign in" : "Create one"}
        </button>
      </p>
    </main>
  );
};

export default Auth;
