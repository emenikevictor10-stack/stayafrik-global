import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RoleProvider, useRole } from "@/contexts/RoleContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Auth from "./pages/auth/Auth";
import Welcome from "./pages/auth/Welcome";
import ResetPassword from "./pages/auth/ResetPassword";
import { MobileShell } from "@/components/shell/MobileShell";
import Index from "./pages/Index";
import Explore from "./pages/client/Explore";
import PropertyDetail from "./pages/client/PropertyDetail";
import Bookings from "./pages/client/Bookings";
import BookProperty from "./pages/client/BookProperty";
import Listings from "./pages/agent/Listings";
import NewListing from "./pages/agent/NewListing";
import EditListing from "./pages/agent/EditListing";
import Escrow from "./pages/agent/Escrow";
import EscrowDetail from "./pages/agent/EscrowDetail";
import AgentProfile from "./pages/agent/AgentProfile";
import Verification from "./pages/agent/Verification";
import Commission from "./pages/agent/Commission";
import PayoutAccount from "./pages/agent/PayoutAccount";
import Performance from "./pages/agent/Performance";
import Messages from "./pages/shared/Messages";
import ChatThread from "./pages/shared/ChatThread";
import Profile from "./pages/shared/Profile";
import EditProfile from "./pages/shared/EditProfile";
import LanguageCurrency from "./pages/shared/LanguageCurrency";
import Help from "./pages/shared/Help";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const SecondTab = () => {
  const { role } = useRole();
  return role === "client" ? <Explore /> : <Listings />;
};

const ThirdTab = () => {
  const { role } = useRole();
  return role === "client" ? <Bookings /> : <Escrow />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner position="top-center" />
      <AuthProvider>
        <RoleProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/welcome" element={<Welcome />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<MobileShell />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/explore" element={<SecondTab />} />
                  <Route path="/listings" element={<SecondTab />} />
                  <Route path="/listings/new" element={<NewListing />} />
                  <Route path="/listings/:id/edit" element={<EditListing />} />
                  <Route path="/bookings" element={<ThirdTab />} />
                  <Route path="/escrow" element={<ThirdTab />} />
                  <Route path="/escrow/:code" element={<EscrowDetail />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/messages/:agentId" element={<ChatThread />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/profile/edit" element={<EditProfile />} />
                  <Route path="/profile/agent" element={<AgentProfile />} />
                  <Route path="/profile/verification" element={<Verification />} />
                  <Route path="/profile/commission" element={<Commission />} />
                  <Route path="/profile/payout" element={<PayoutAccount />} />
                  <Route path="/profile/performance" element={<Performance />} />
                  <Route path="/profile/language" element={<LanguageCurrency />} />
                  <Route path="/profile/help" element={<Help />} />
                  <Route path="/property/:id" element={<PropertyDetail />} />
                  <Route path="/property/:id/book" element={<BookProperty />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </RoleProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
