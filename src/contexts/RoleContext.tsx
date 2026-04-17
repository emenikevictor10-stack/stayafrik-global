import { createContext, useContext, useState, ReactNode } from "react";

export type Role = "client" | "agent";

type RoleCtx = {
  role: Role;
  setRole: (r: Role) => void;
  user: { name: string; emoji: string };
};

const Ctx = createContext<RoleCtx | null>(null);

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  const [role, setRole] = useState<Role>("client");
  const user =
    role === "client"
      ? { name: "Adaeze O.", emoji: "🙋🏾‍♀️" }
      : { name: "Emeka I.", emoji: "🧑🏾‍💼" };
  return <Ctx.Provider value={{ role, setRole, user }}>{children}</Ctx.Provider>;
};

export const useRole = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useRole outside provider");
  return c;
};
