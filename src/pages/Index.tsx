import { useRole } from "@/contexts/RoleContext";
import Explore from "./client/Explore";
import { AgentDashboard } from "./agent/AgentDashboard";

const Index = () => {
  const { role } = useRole();
  return role === "agent" ? <AgentDashboard /> : <Explore />;
};

export default Index;
