import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RoleProvider, useRole } from "@/contexts/RoleContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Auth from "./pages/auth/Auth";
import Welcome from "./pages/auth/Welcome";
import ResetPassword from "./pages/auth/ResetPassword";
import OAuthConsent from "./pages/auth/OAuthConsent";
import { MobileShell } from "@/components/shell/MobileShell";
import Index from "./pages/Index";
import Explore from "./pages/client/Explore";
import Saved from "./pages/client/Saved";
import PropertyDetail from "./pages/client/PropertyDetail";
import Bookings from "./pages/client/Bookings";
import BookProperty from "./pages/client/BookProperty";
import BookingConfirm from "./pages/client/BookingConfirm";
import Listings from "./pages/agent/Listings";
import BecomeHost from "./pages/agent/BecomeHost";
import NewListing from "./pages/agent/NewListing";
import EditListing from "./pages/agent/EditListing";
import HostHome from "./pages/host/HostHome";
import HostRequests from "./pages/host/HostRequests";
import HostBookings from "./pages/host/HostBookings";
import HostPayouts from "./pages/host/HostPayouts";
import HostCalendar from "./pages/host/HostCalendar";
import ListYourPlace from "./pages/host/ListYourPlace";
import EscrowDetail from "./pages/agent/EscrowDetail";
import AgentProfile from "./pages/agent/AgentProfile";
import Verification from "./pages/agent/Verification";
import Commission from "./pages/agent/Commission";
import PayoutAccount from "./pages/agent/PayoutAccount";
import Performance from "./pages/agent/Performance";
import AdminListings from "./pages/admin/AdminListings";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminUserDetail from "./pages/admin/AdminUserDetail";
import AdminBookings from "./pages/admin/AdminBookings";
import AdminPartnerBookings from "./pages/admin/AdminPartnerBookings";
import AdminReservations from "./pages/admin/AdminReservations";
import AdminReviews from "./pages/admin/AdminReviews";
import { AdminAddons, AdminDateChanges } from "./pages/admin/AdminExtras";
import AdminBankTransfers from "./pages/admin/AdminBankTransfers";
import TransferPay from "./pages/client/TransferPay";
import { AdminPayments, AdminMessages, AdminHealth, AdminInsights, AdminTeam } from "./pages/admin/AdminOps";
import AdminHosts from "./pages/admin/AdminHosts";
import AdminPayouts from "./pages/admin/AdminPayouts";
import AdminKyc from "./pages/admin/AdminKyc";
import AdminAudit from "./pages/admin/AdminAudit";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminLocationAudit from "./pages/admin/AdminLocationAudit";
import AdminSupport from "./pages/admin/AdminSupport";
import ReportProblem from "./pages/client/ReportProblem";
import IssueThread from "./pages/client/IssueThread";
import MyIssues from "./pages/client/MyIssues";
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
import Reservations from "./pages/shared/Reservations";
import PaymentMethods from "./pages/client/PaymentMethods";
import PinSettings from "./pages/shared/PinSettings";
import DeleteAccount from "./pages/shared/DeleteAccount";
import { PinGate } from "@/components/auth/PinGate";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import NotFound from "./pages/NotFound";
import StayMedia from "./pages/client/StayMedia";
import SharedList from "./pages/client/SharedList";
import Compare from "./pages/client/Compare";
import AreaPage from "./pages/client/AreaPage";
import { TripDetail, TripCancel, TripReview, TripInvoice, FindBooking, TripMove, TripGuests } from "./pages/client/TripPages";
import GuestDetails from "./pages/client/GuestDetails";
import { PayShare } from "./pages/client/SplitAddons";
import { GuidesIndex, GuidePage } from "./pages/client/Guides";
import { syncWishlist } from "@/hooks/useWishlist";
import { useAuth } from "@/contexts/AuthContext";

const queryClient = new QueryClient();

const ThirdTab = () => {
  const { role } = useRole();
  return role === "client" ? <Bookings /> : <Navigate to="/host/payouts" replace />;
};

const PushBridge = () => { usePushNotifications(); return null; };
/** Moves device hearts into the account once per sign-in. */
const WishlistBridge = () => {
  const { user } = useAuth();
  useEffect(() => { if (user) void syncWishlist(user.id); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner position="top-center" />
      <AuthProvider>
        <RoleProvider>
          <PushBridge />
          <WishlistBridge />
          <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/welcome" element={<Welcome />} />
                <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />

                {/* Public routes — explore is the default page, browsable without login */}
                <Route element={<MobileShell />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/explore" element={<Explore />} />
                  <Route path="/results" element={<Explore />} />
                  <Route path="/search" element={<Explore />} />
                  <Route path="/home" element={<Index />} />
                  <Route path="/stays/:id" element={<PropertyDetail />} />
                  <Route path="/stays/:id/media" element={<StayMedia />} />
                  <Route path="/saved" element={<Saved />} />
                  <Route path="/saved/shared/:token" element={<SharedList />} />
                  <Route path="/w/:token" element={<SharedList />} />
                  <Route path="/saved/:id" element={<Saved />} />
                  <Route path="/compare" element={<Compare />} />
                  <Route path="/stays-in/:slug" element={<AreaPage />} />
                  <Route path="/guides" element={<GuidesIndex />} />
                  <Route path="/find-booking" element={<FindBooking />} />
                  <Route path="/help/find-booking" element={<FindBooking />} />
                  <Route path="/pay/share/:token" element={<PayShare />} />
                  <Route path="/guides/:slug" element={<GuidePage />} />
                  <Route path="/property/:id" element={<PropertyDetail />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/terms" element={<TermsConditions />} />
                  <Route path="/list-your-place" element={<ListYourPlace />} />
                  {/* Checkout is open to everyone; sign-in is asked only when pressing Pay. */}
                  <Route path="/property/:id/book" element={<PinGate><BookProperty /></PinGate>} />
                </Route>

                {/* Authenticated routes */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<PinGate><MobileShell /></PinGate>}>
                    <Route path="/listings" element={<Navigate to="/host/listings" replace />} />
                    <Route path="/host" element={<HostHome />} />
                    <Route path="/host/listings" element={<Listings />} />
                    <Route path="/host/calendar" element={<HostCalendar />} />
                    <Route path="/host/requests" element={<HostRequests />} />
                    <Route path="/host/bookings" element={<HostBookings />} />
                    <Route path="/host/payouts" element={<HostPayouts />} />
                    <Route path="/become-host" element={<BecomeHost />} />
                    <Route path="/listings/new" element={<NewListing />} />
                    <Route path="/listings/:id/edit" element={<EditListing />} />
                    <Route path="/trips" element={<ThirdTab />} />
                    <Route path="/bookings" element={<Navigate to="/trips" replace />} />
                    <Route path="/escrow" element={<ThirdTab />} />
                    <Route path="/escrow/:code" element={<EscrowDetail />} />
                    <Route path="/messages" element={<Messages />} />
                    <Route path="/messages/:agentId" element={<ChatThread />} />
                    <Route path="/account" element={<Profile />} />
                    <Route path="/profile" element={<Navigate to="/account" replace />} />
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
                    <Route path="/notifications" element={<Navigate to="/home?notifications=1" replace />} />
                    <Route path="/booking/confirm" element={<BookingConfirm />} />
                    <Route path="/reservations" element={<Reservations />} />
                    <Route path="/profile/delete" element={<DeleteAccount />} />
                    <Route path="/trips/:id/report" element={<ReportProblem />} />
                    <Route path="/trips/:id" element={<TripDetail />} />
                    <Route path="/pay/transfer/:id" element={<TransferPay />} />
                    <Route path="/trips/:id/cancel" element={<TripCancel />} />
                    <Route path="/trips/:id/review" element={<TripReview />} />
                    <Route path="/trips/:id/move" element={<TripMove />} />
                    <Route path="/trips/:id/guests" element={<TripGuests />} />
                    <Route path="/trips/:id/invoice" element={<TripInvoice />} />
                    <Route path="/details" element={<GuestDetails />} />
                    <Route path="/details/passport" element={<GuestDetails passport />} />
                    <Route path="/issues" element={<MyIssues />} />
                    <Route path="/issues/:id" element={<IssueThread />} />
                    
                  </Route>
                </Route>

                {/* Admin console — separate desktop-first shell */}
                <Route element={<RequireAdmin />}>
                  <Route element={<AdminLayout />}>
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/admin/listings" element={<AdminListings />} />
                    <Route path="/admin/users" element={<AdminUsers />} />
                    <Route path="/admin/users/:id" element={<AdminUserDetail />} />
                    <Route path="/admin/bookings" element={<AdminBookings />} />
                    <Route path="/admin/support" element={<AdminSupport />} />
                    <Route path="/admin/partner-bookings" element={<AdminPartnerBookings />} />
                    <Route path="/admin/reservations" element={<AdminReservations />} />
                    <Route path="/admin/reviews" element={<AdminReviews />} />
                    <Route path="/admin/addons" element={<AdminAddons />} />
                    <Route path="/admin/payments" element={<AdminPayments />} />
                    <Route path="/admin/bank-transfers" element={<AdminBankTransfers />} />
                    <Route path="/admin/messages" element={<AdminMessages />} />
                    <Route path="/admin/health" element={<AdminHealth />} />
                    <Route path="/admin/insights" element={<AdminInsights />} />
                    <Route path="/admin/team" element={<AdminTeam />} />
                    <Route path="/admin/date-changes" element={<AdminDateChanges />} />
                    <Route path="/admin/payouts" element={<AdminPayouts />} />
                    <Route path="/admin/hosts" element={<AdminHosts />} />
                    <Route path="/admin/kyc" element={<AdminKyc />} />
                    <Route path="/admin/audit" element={<AdminAudit />} />
                    <Route path="/admin/settings" element={<AdminSettings />} />
                    <Route path="/admin/location-audit" element={<AdminLocationAudit />} />
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
