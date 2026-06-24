import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useState } from "react";
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
import BookingConfirm from "./pages/client/BookingConfirm";
import Listings from "./pages/agent/Listings";
import BecomeHost from "./pages/agent/BecomeHost";
import NewListing from "./pages/agent/NewListing";
import EditListing from "./pages/agent/EditListing";
import Escrow from "./pages/agent/Escrow";
import EscrowDetail from "./pages/agent/EscrowDetail";
import AgentProfile from "./pages/agent/AgentProfile";
import Verification from "./pages/agent/Verification";
import Commission from "./pages/agent/Commission";
import PayoutAccount from "./pages/agent/PayoutAccount";
import Performance from "./pages/agent/Performance";
import AdminListings from "./pages/admin/AdminListings";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminBookings from "./pages/admin/AdminBookings";
import AdminPayouts from "./pages/admin/AdminPayouts";
import AdminKyc from "./pages/admin/AdminKyc";
import AdminAudit from "./pages/admin/AdminAudit";
import { RequireAdmin } from "@/components/admin/RequireAdmin";
import { AdminLayout } from "@/components/admin/AdminLayout";
import Messages from "./pages/shared/Messages";
import ChatThread from "./pages/shared/ChatThread";
import Profile from "./pages/shared/Profile";
import EditProfile from "./pages/shared/EditProfile";
import LanguageCurrency from "./pages/shared/LanguageCurrency";
import Help from "./pages/shared/Help";
import PrivacyPolicy from "./pages/shared/PrivacyPolicy";
import TermsConditions from "./pages/shared/TermsConditions";
import Notifications from "./pages/shared/Notifications";
import PaymentMethods from "./pages/client/PaymentMethods";
import PinSettings from "./pages/shared/PinSettings";
import { PinGate } from "@/components/auth/PinGate";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { SplashSequence, hasSeenSplash } from "@/components/splash/SplashSequence";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ThirdTab = () => {
  const { role } = useRole();
  return role === "client" ? <Bookings /> : <Escrow />;
};

const PushBridge = () => { usePushNotifications(); return null; };

const SplashGate = ({ children }: { children: React.ReactNode }) => {
  const [seen, setSeen] = useState(() => hasSeenSplash());
  if (!seen) return <SplashSequence onDone={() => setSeen(true)} />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner position="top-center" />
      <AuthProvider>
        <RoleProvider>
          <PushBridge />
          <BrowserRouter>
            <SplashGate>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/welcome" element={<Welcome />} />

                {/* Public routes — explore is the default page, browsable without login */}
                <Route element={<PinGate><MobileShell /></PinGate>}>
                  <Route path="/" element={<Index />} />
                  <Route path="/explore" element={<Index />} />
                  <Route path="/property/:id" element={<PropertyDetail />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/terms" element={<TermsConditions />} />
                </Route>

                {/* Authenticated routes */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<PinGate><MobileShell /></PinGate>}>
                    <Route path="/listings" element={<Listings />} />
                    <Route path="/become-host" element={<BecomeHost />} />
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
                    <Route path="/profile/payments" element={<PaymentMethods />} />
                    <Route path="/profile/pin" element={<PinSettings />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/property/:id/book" element={<BookProperty />} />
                    <Route path="/booking/confirm" element={<BookingConfirm />} />
                    <Route path="/admin/listings" element={<AdminListings />} />
                  </Route>
                </Route>

                {/* Admin console — separate desktop-first shell */}
                <Route element={<RequireAdmin />}>
                  <Route element={<AdminLayout />}>
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/admin/users" element={<AdminUsers />} />
                    <Route path="/admin/bookings" element={<AdminBookings />} />
                    <Route path="/admin/payouts" element={<AdminPayouts />} />
                    <Route path="/admin/kyc" element={<AdminKyc />} />
                    <Route path="/admin/audit" element={<AdminAudit />} />
                  </Route>
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </SplashGate>
          </BrowserRouter>
        </RoleProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
