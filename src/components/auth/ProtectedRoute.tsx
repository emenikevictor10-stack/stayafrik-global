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
      // Enforce email verification (skip for OAuth users who arrive already confirmed)
      if (!user.email_confirmed_at && !user.confirmed_at) {
        setNeedsVerify(true);
        setChecking(false);
        return;
      }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
      if (data?.role) setRole(data.role as Role);
      const onboarded = localStorage.getItem(`stay:onboarded:${user.id}`) === "1";
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
