import { createContext, useContext, useState, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";

export type Role = "client" | "agent";

type RoleCtx = {
  role: Role;
  setRole: (r: Role) => void;
  user: { name: string; emoji: string; avatarUrl?: string | null };
};

const Ctx = createContext<RoleCtx | null>(null);

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  const { user: authUser, profile } = useAuth();
  const [role, setRole] = useState<Role>("client");
  const fallbackName = authUser?.email?.split("@")[0] || (role === "client" ? "Guest" : "Host");
  const user = {
    name: profile?.full_name || authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || fallbackName,
    emoji: role === "client" ? "🙋🏾‍♀️" : "🧑🏾‍💼",
    avatarUrl: profile?.avatar_url || authUser?.user_metadata?.avatar_url || authUser?.user_metadata?.picture || null,
  };
  return <Ctx.Provider value={{ role, setRole, user }}>{children}</Ctx.Provider>;
};

export const useRole = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useRole outside provider");
  return c;
};
