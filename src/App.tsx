import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RoleProvider, useRole } from "@/contexts/RoleContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MobileShell } from "@/components/shell/MobileShell";
import Index from "./pages/Index";
import Explore from "./pages/client/Explore";
import PropertyDetail from "./pages/client/PropertyDetail";
import { RequireAdmin } from "@/components/admin/RequireAdmin";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PinGate } from "@/components/auth/PinGate";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import NotFound from "./pages/NotFound";
import { syncWishlist } from "@/hooks/useWishlist";
import { useAuth } from "@/contexts/AuthContext";

const Auth = lazy(() => import("./pages/auth/Auth"));
const Welcome = lazy(() => import("./pages/auth/Welcome"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const OAuthConsent = lazy(() => import("./pages/auth/OAuthConsent"));
const Saved = lazy(() => import("./pages/client/Saved"));
const Bookings = lazy(() => import("./pages/client/Bookings"));
const BookProperty = lazy(() => import("./pages/client/BookProperty"));
const BookingConfirm = lazy(() => import("./pages/client/BookingConfirm"));
const Listings = lazy(() => import("./pages/agent/Listings"));
const BecomeHost = lazy(() => import("./pages/agent/BecomeHost"));
const NewListing = lazy(() => import("./pages/agent/NewListing"));
const EditListing = lazy(() => import("./pages/agent/EditListing"));
const HostHome = lazy(() => import("./pages/host/HostHome"));
const HostRequests = lazy(() => import("./pages/host/HostRequests"));
const HostLocation = lazy(() => import("./pages/host/HostLocation"));
const HostBookings = lazy(() => import("./pages/host/HostBookings"));
const HostPayouts = lazy(() => import("./pages/host/HostPayouts"));
const HostCalendar = lazy(() => import("./pages/host/HostCalendar"));
const ListYourPlace = lazy(() => import("./pages/host/ListYourPlace"));
const EscrowDetail = lazy(() => import("./pages/agent/EscrowDetail"));
const AgentProfile = lazy(() => import("./pages/agent/AgentProfile"));
const Verification = lazy(() => import("./pages/agent/Verification"));
const Commission = lazy(() => import("./pages/agent/Commission"));
const PayoutAccount = lazy(() => import("./pages/agent/PayoutAccount"));
const Performance = lazy(() => import("./pages/agent/Performance"));
const AdminListings = lazy(() => import("./pages/admin/AdminListings"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminUserDetail = lazy(() => import("./pages/admin/AdminUserDetail"));
const AdminBookings = lazy(() => import("./pages/admin/AdminBookings"));
const AdminPartnerBookings = lazy(() => import("./pages/admin/AdminPartnerBookings"));
const AdminReservations = lazy(() => import("./pages/admin/AdminReservations"));
const AdminReviews = lazy(() => import("./pages/admin/AdminReviews"));
const AdminGuides = lazy(() => import("./pages/admin/AdminGuides"));
const AdminInsights = lazy(() => import("./pages/admin/AdminInsights"));
const AdminAddons = lazy(() => import("./pages/admin/AdminExtras").then((m) => ({ default: m.AdminAddons })));
const AdminDateChanges = lazy(() => import("./pages/admin/AdminExtras").then((m) => ({ default: m.AdminDateChanges })));
const AdminBankTransfers = lazy(() => import("./pages/admin/AdminBankTransfers"));
const TransferPay = lazy(() => import("./pages/client/TransferPay"));
const AdminPayments = lazy(() => import("./pages/admin/AdminOps").then((m) => ({ default: m.AdminPayments })));
const AdminMessages = lazy(() => import("./pages/admin/AdminOps").then((m) => ({ default: m.AdminMessages })));
const AdminHealth = lazy(() => import("./pages/admin/AdminOps").then((m) => ({ default: m.AdminHealth })));
const AdminTeam = lazy(() => import("./pages/admin/AdminOps").then((m) => ({ default: m.AdminTeam })));
const AdminHosts = lazy(() => import("./pages/admin/AdminHosts"));
const AdminPayouts = lazy(() => import("./pages/admin/AdminPayouts"));
const AdminKyc = lazy(() => import("./pages/admin/AdminKyc"));
const AdminAudit = lazy(() => import("./pages/admin/AdminAudit"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminLocationAudit = lazy(() => import("./pages/admin/AdminLocationAudit"));
const AdminSupport = lazy(() => import("./pages/admin/AdminSupport"));
const ReportProblem = lazy(() => import("./pages/client/ReportProblem"));
const IssueThread = lazy(() => import("./pages/client/IssueThread"));
const MyIssues = lazy(() => import("./pages/client/MyIssues"));
const Messages = lazy(() => import("./pages/shared/Messages"));
const ChatThread = lazy(() => import("./pages/shared/ChatThread"));
const Profile = lazy(() => import("./pages/shared/Profile"));
const EditProfile = lazy(() => import("./pages/shared/EditProfile"));
const LanguageCurrency = lazy(() => import("./pages/shared/LanguageCurrency"));
const Help = lazy(() => import("./pages/shared/Help"));
const PrivacyPolicy = lazy(() => import("./pages/shared/PrivacyPolicy"));
const TermsConditions = lazy(() => import("./pages/shared/TermsConditions"));
const Reservations = lazy(() => import("./pages/shared/Reservations"));
const PaymentMethods = lazy(() => import("./pages/client/PaymentMethods"));
const PinSettings = lazy(() => import("./pages/shared/PinSettings"));
const DeleteAccount = lazy(() => import("./pages/shared/DeleteAccount"));
const StayMedia = lazy(() => import("./pages/client/StayMedia"));
const SharedList = lazy(() => import("./pages/client/SharedList"));
const Compare = lazy(() => import("./pages/client/Compare"));
const AreaPage = lazy(() => import("./pages/client/AreaPage"));
const TripDetail = lazy(() => import("./pages/client/TripPages").then((m) => ({ default: m.TripDetail })));
const TripCancel = lazy(() => import("./pages/client/TripPages").then((m) => ({ default: m.TripCancel })));
const TripReview = lazy(() => import("./pages/client/TripPages").then((m) => ({ default: m.TripReview })));
const TripInvoice = lazy(() => import("./pages/client/TripPages").then((m) => ({ default: m.TripInvoice })));
const FindBooking = lazy(() => import("./pages/client/TripPages").then((m) => ({ default: m.FindBooking })));
const TripMove = lazy(() => import("./pages/client/TripPages").then((m) => ({ default: m.TripMove })));
const TripGuests = lazy(() => import("./pages/client/TripPages").then((m) => ({ default: m.TripGuests })));
const GuestDetails = lazy(() => import("./pages/client/GuestDetails"));
const PayShare = lazy(() => import("./pages/client/SplitAddons").then((m) => ({ default: m.PayShare })));
const GuidesIndex = lazy(() => import("./pages/client/Guides").then((m) => ({ default: m.GuidesIndex })));
const GuidePage = lazy(() => import("./pages/client/Guides").then((m) => ({ default: m.GuidePage })));

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } } });
const PageFallback = () => <div className="min-h-[50vh]" aria-busy="true" />;

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
              <Suspense fallback={<PageFallback />}>
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
                    <Route path="/host/location/:id" element={<HostLocation />} />
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
                    <Route path="/admin/guides" element={<AdminGuides />} />
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
              </Suspense>
          </BrowserRouter>
        </RoleProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
