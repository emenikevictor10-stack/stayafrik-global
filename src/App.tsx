import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RoleProvider, useRole } from "@/contexts/RoleContext";
import { MobileShell } from "@/components/shell/MobileShell";
import Index from "./pages/Index";
import Explore from "./pages/client/Explore";
import PropertyDetail from "./pages/client/PropertyDetail";
import Bookings from "./pages/client/Bookings";
import Listings from "./pages/agent/Listings";
import Escrow from "./pages/agent/Escrow";
import AgentProfile from "./pages/agent/AgentProfile";
import Verification from "./pages/agent/Verification";
import Commission from "./pages/agent/Commission";
import Performance from "./pages/agent/Performance";
import Messages from "./pages/shared/Messages";
import Profile from "./pages/shared/Profile";
import Help from "./pages/shared/Help";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Role-aware second tab: Explore (client) or Listings (agent)
const SecondTab = () => {
  const { role } = useRole();
  return role === "client" ? <Explore /> : <Listings />;
};

// Role-aware third tab: Bookings (client) or Escrow (agent)
const ThirdTab = () => {
  const { role } = useRole();
  return role === "client" ? <Bookings /> : <Escrow />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner position="top-center" />
      <RoleProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<MobileShell />}>
              <Route path="/" element={<Index />} />
              <Route path="/explore" element={<SecondTab />} />
              <Route path="/listings" element={<SecondTab />} />
              <Route path="/bookings" element={<ThirdTab />} />
              <Route path="/escrow" element={<ThirdTab />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/agent" element={<AgentProfile />} />
              <Route path="/profile/verification" element={<Verification />} />
              <Route path="/profile/commission" element={<Commission />} />
              <Route path="/profile/performance" element={<Performance />} />
              <Route path="/profile/help" element={<Help />} />
              <Route path="/property/:id" element={<PropertyDetail />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </RoleProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
