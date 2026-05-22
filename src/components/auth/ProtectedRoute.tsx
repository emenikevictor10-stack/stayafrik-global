import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRole, Role } from "@/contexts/RoleContext";
import { supabase } from "@/integrations/supabase/client";

export const ProtectedRoute = () => {
  const { session, loading, user } = useAuth();
  const { setRole } = useRole();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [needsVerify, setNeedsVerify] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!user) { setChecking(false); return; }
      if (!user.email_confirmed_at && !user.confirmed_at) {
        setNeedsVerify(true);
        setChecking(false);
        return;
      }

      // Role
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      if (roleRow?.role) setRole(roleRow.role as Role);

      // Splash only for genuinely new users.
      // If the profile is older than 2 minutes OR they already have any listing/booking,
      // treat them as returning and auto-mark onboarded.
      const flagKey = `stay:onboarded:${user.id}`;
      let onboarded = localStorage.getItem(flagKey) === "1";
      if (!onboarded) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("created_at")
          .eq("user_id", user.id)
          .maybeSingle();
        const created = prof?.created_at ? new Date(prof.created_at).getTime() : Date.now();
        const ageMs = Date.now() - created;
        if (ageMs > 2 * 60 * 1000) {
          localStorage.setItem(flagKey, "1");
          onboarded = true;
        }
      }
      setNeedsOnboarding(!onboarded);
      setChecking(false);
    };
    run();
  }, [user, setRole]);

  if (loading || (session && checking)) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </main>
    );
  }
  if (!session) return <Navigate to="/auth" state={{ from: location }} replace />;
  if (needsVerify && location.pathname !== "/auth") return <Navigate to="/auth" replace />;
  if (needsOnboarding && location.pathname !== "/welcome") return <Navigate to="/welcome" replace />;
  return <Outlet />;
};
