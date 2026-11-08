import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/ui/kit";
import { ShieldCheck, Loader2 } from "lucide-react";

// Beta namespace — provide a local typed wrapper.
type OAuthResult = { data?: { redirect_url?: string; redirect_to?: string; client?: { name?: string; client_uri?: string }; scopes?: string[]; redirect_uri?: string }; error?: { message: string } };
const oauthApi = (supabase.auth as unknown as {
  oauth: {
    getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
    approveAuthorization: (id: string) => Promise<OAuthResult>;
    denyAuthorization: (id: string) => Promise<OAuthResult>;
  };
}).oauth;

const isSameOriginPath = (v: string | null) => !!v && v.startsWith("/") && !v.startsWith("//");

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<OAuthResult["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Missing authorization_id");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await oauthApi.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError(error.message);
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) { window.location.href = immediate; return; }
      setDetails(data ?? null);
    })();
    return () => { active = false; };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauthApi.approveAuthorization(authorizationId)
      : await oauthApi.denyAuthorization(authorizationId);
    if (error) { setBusy(false); return setError(error.message); }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); return setError("No redirect returned by the authorization server."); }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="min-h-screen bg-background text-foreground px-6 py-16 max-w-md mx-auto">
        <h1 className="text-xl font-extrabold mb-2">Couldn't load authorization</h1>
        <p className="text-sm text-muted-foreground">{error}</p>
      </main>
    );
  }
  if (!details) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </main>
    );
  }

  const clientName = details.client?.name ?? "An external app";

  return (
    <main className="min-h-screen bg-background text-foreground px-6 pt-10 pb-12 max-w-md mx-auto flex flex-col">
      <div className="flex flex-col items-center text-center mb-8">
        <Logo className="h-10 mb-3" />
        <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mb-4">
          <ShieldCheck className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-extrabold">Connect {clientName} to StayGlobal</h1>
        <p className="text-sm text-muted-foreground mt-2">
          This lets <span className="font-semibold text-foreground">{clientName}</span> use StayGlobal as you.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-3 text-sm">
        <div>
          <div className="text-xs text-muted-foreground mb-1">What it can do</div>
          <ul className="list-disc list-inside space-y-1 text-foreground">
            <li>Search verified shortlet listings</li>
            <li>Read your bookings, listings and notifications</li>
            <li>Read your basic profile</li>
          </ul>
        </div>
        {details.redirect_uri && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Redirects to</div>
            <div className="text-xs text-muted-foreground break-all">{details.redirect_uri}</div>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          This does not bypass StayGlobal's permissions or backend policies.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          disabled={busy}
          onClick={() => decide(false)}
          className="rounded-xl border border-border bg-card font-semibold py-3.5 text-sm disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          disabled={busy}
          onClick={() => decide(true)}
          className="rounded-xl bg-primary text-primary-foreground font-bold py-3.5 text-sm disabled:opacity-60"
        >
          {busy ? "Working…" : "Approve"}
        </button>
      </div>
    </main>
  );
}

export { isSameOriginPath };
