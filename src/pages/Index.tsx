import { useRole } from "@/contexts/RoleContext";
import { ClientHome } from "./client/ClientHome";
import { AgentDashboard } from "./agent/AgentDashboard";

const Index = () => {
  const { role } = useRole();
  return role === "client" ? <ClientHome /> : <AgentDashboard />;
};

export default Index;
