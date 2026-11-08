import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Logo } from "@/ui/kit";
import { ChevronLeft, KeyRound } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase parses the recovery token automatically from the URL hash.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    if (password !== confirm) return toast.error("Passwords do not match");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated. You're signed in.");
    navigate("/", { replace: true });
  };

  return (
    <main className="min-h-screen bg-background text-foreground px-6 pt-10 pb-12 max-w-md mx-auto">
      <button onClick={() => navigate("/auth", { replace: true })} className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center mb-6">
        <ChevronLeft className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-3 mb-2">
        <Logo className="h-10" />
        <h1 className="text-2xl font-extrabold">Set a new password</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-7 flex items-center gap-2">
        <KeyRound className="w-4 h-4" /> Choose a strong password you'll remember.
      </p>

      {!ready ? (
        <div className="rounded-xl bg-secondary border border-border p-4 text-sm text-muted-foreground">
          Open the password reset link from your email on this device to continue.
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" minLength={8} required
            className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-sm" />
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm new password" minLength={8} required
            className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-sm" />
          <button disabled={loading} type="submit"
            className="w-full rounded-xl bg-primary text-primary-foreground font-bold py-3.5 text-sm disabled:opacity-60">
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>
      )}
    </main>
  );
};

export default ResetPassword;
