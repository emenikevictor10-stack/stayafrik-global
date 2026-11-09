import { useRole } from "@/contexts/RoleContext";
import Explore from "./client/Explore";
import { AgentDashboard } from "./agent/AgentDashboard";

/** Home is the stays list (Airbnb-style); hosts land on their dashboard. */
const Index = () => {
  const { role } = useRole();
  return role === "agent" ? <AgentDashboard /> : <Explore />;
};

export default Index;
