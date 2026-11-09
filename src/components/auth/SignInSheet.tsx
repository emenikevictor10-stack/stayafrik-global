import { useState } from "react";
import { Sheet } from "@/ui/kit";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

const G = () => (
  <svg aria-hidden="true" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
);

/** Sign-in asked only at the moment it's needed (e.g. Pay). Returns to `returnPath` after Google. */
export const SignInSheet = ({ open, onOpenChange, returnPath, title = "Sign in to pay" }: {
  open: boolean; onOpenChange: (o: boolean) => void; returnPath: string; title?: string;
}) => {
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + returnPath });
    if (r.error) { toast.error("Google sign-in failed. Please try again."); setBusy(false); return; }
    if (!r.redirected) onOpenChange(false); // session set in place (preview popup)
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title}>
      <p className="text-[15px] text-muted-foreground">Your dates and details are saved. Sign in to finish your booking — it takes a few seconds.</p>
      {/* Google brand button: fixed brand colours per Google's guidelines */}
      <button type="button" onClick={go} disabled={busy}
        style={{ background: "#FFFFFF", color: "#1F1F1F", border: "1px solid #747775" }}
        className="mt-4 w-full min-h-11 rounded-lg flex items-center justify-center gap-2.5 px-3 text-[15px] font-medium disabled:opacity-60">
        <G /> Continue with Google
      </button>
      <p className="text-xs text-muted-foreground mt-3">
        By continuing, you agree to our <a href="/terms" className="underline">Terms</a> and <a href="/privacy-policy" className="underline">Privacy Policy</a>.
      </p>
    </Sheet>
  );
};
