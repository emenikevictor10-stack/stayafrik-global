import { createContext, useContext, useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { canOpen, isTeamRole } from "./adminNav";
import { AdminSignIn } from "./AdminSignIn";

const StaffRolesCtx = createContext<string[]>([]);
/** Team roles of the signed-in staff member (admin, support, finance, listings). */
export const useStaffRoles = () => useContext(StaffRolesCtx);

/** Guards /admin/*: any team role may enter; each page is limited to its roles. Server re-checks every action. */
export const RequireAdmin = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [roles, setRoles] = useState<string[] | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { setRoles([]); return; }
    setRoles(null);
    (async () => {
      // Picks up any pending team invite for this email.
      await supabase.rpc("accept_team_invites" as any).then(() => undefined, () => undefined);
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      setRoles((data || []).map((r: any) => String(r.role)).filter(isTeamRole));
    })();
  }, [user, loading]);

  if (loading || roles === null) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </main>
    );
  }
  if (!user) return <AdminSignIn path={location.pathname + location.search} />;
  if (!roles.length) return <AdminSignIn path={location.pathname + location.search} noAccessEmail={user.email} />;
  return (
    <StaffRolesCtx.Provider value={roles}>
      <Outlet />
    </StaffRolesCtx.Provider>
  );
};

/** Rendered inside the admin shell via RequireSection. */
export const RequireSection = ({ children }: { children: React.ReactNode }) => {
  const roles = useStaffRoles();
  const { pathname } = useLocation();
  return canOpen(pathname, roles) ? <>{children}</> : <NoAccess />;
};

const NoAccess = () => (
  <main className="min-h-[60vh] flex flex-col items-center justify-center gap-3 p-6 text-center">
    <h1 className="text-lg font-semibold">No access</h1>
    <p className="text-sm text-muted-foreground max-w-sm">Your team role doesn't include this page. Ask an admin if you need it.</p>
    <Link to="/admin" className="text-sm font-semibold text-primary underline">Back to overview</Link>
  </main>
);
