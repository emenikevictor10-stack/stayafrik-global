import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/ui/kit";

const GoogleG = () => (
  <svg aria-hidden="true" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
);

/** Team-only sign-in for /admin. `noAccessEmail` shows the "not on the team" state. */
export const AdminSignIn = ({ path, noAccessEmail }: { path: string; noAccessEmail?: string | null }) => {
  const [busy, setBusy] = useState(false);

  const google = async () => {
    setBusy(true);
    sessionStorage.setItem("sg-admin-return", path);
    if (noAccessEmail) await supabase.auth.signOut();
    const r = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
      extraParams: { prompt: "select_account" },
    });
    if (r.error) { setBusy(false); toast.error("Sign-in didn't work. Please try again."); return; }
    if (!r.redirected) setBusy(false); // session set in place (preview popup)
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center space-y-5">
        <div className="flex justify-center"><Logo className="h-8" /></div>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Team sign-in</h1>
          {noAccessEmail
            ? <p className="text-sm text-muted-foreground">This account doesn't have team access. Ask an admin to invite <span className="font-semibold text-foreground break-all">{noAccessEmail}</span>.</p>
            : <p className="text-sm text-muted-foreground">For the Stay team only. Use the Google account you were invited with.</p>}
        </div>
        {/* Google brand button: fixed brand colours per Google's guidelines */}
        <button type="button" onClick={google} disabled={busy}
          style={{ background: "#FFFFFF", color: "#1F1F1F", border: "1px solid #747775" }}
          className="w-full min-h-11 rounded-lg inline-flex items-center justify-center gap-2.5 px-3 text-sm font-medium disabled:opacity-60">
          <GoogleG />
          {busy ? "Opening Google…" : noAccessEmail ? "Sign in with a different account" : "Sign in with Google"}
        </button>
        <Link to="/" className="block text-sm font-semibold text-primary underline">Go to Stay</Link>
      </div>
    </main>
  );
};
