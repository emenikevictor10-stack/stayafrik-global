import { useRole } from "@/contexts/RoleContext";
import Home from "./client/Home";
import { AgentDashboard } from "./agent/AgentDashboard";

const Index = () => {
  const { role } = useRole();
  return role === "agent" ? <AgentDashboard /> : <Home />;
};

export default Index;
