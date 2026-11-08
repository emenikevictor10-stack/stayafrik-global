import { useNavigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";

/** Shared role switch + sign out used by the menu drawer, dock and sidebar. */
export const useNavActions = () => {
  const { role, setRole } = useRole();
  const { profile, session, signOut } = useAuth();
  const navigate = useNavigate();
  const toggleRole = () => {
    if (role === "client") {
      if (!session) return navigate("/auth?mode=signin", { state: { from: "/become-host" } });
      if (!profile?.is_host) return navigate("/become-host");
      setRole("agent");
      navigate("/listings");
    } else {
      setRole("client");
      navigate("/");
    }
  };
  const logOut = async () => { await signOut(); navigate("/"); };
  const roleLabel = role === "client" ? (profile?.is_host ? "Switch to host" : "Become a host") : "Switch to guest";
  return { role, session, toggleRole, logOut, roleLabel };
};
