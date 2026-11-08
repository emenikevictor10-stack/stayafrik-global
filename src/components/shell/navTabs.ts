import {
  Home,
  Search,
  CalendarDays,
  Heart,
  MessageSquare,
  User,
  LayoutDashboard,
  Building2,
  ShieldCheck,
  LifeBuoy,
  Clock,
  HelpCircle,
  FileText,
  Inbox,
  Wallet,
  Lock,
  type LucideIcon,
} from "lucide-react";

export type NavTab = { to: string; Icon: LucideIcon; label: string; key: string };

/** Guest bottom bar / dock — PRD order. */
export const clientTabs: NavTab[] = [
  { to: "/", Icon: Home, label: "Home", key: "home" },
  { to: "/explore", Icon: Search, label: "Explore", key: "explore" },
  { to: "/trips", Icon: CalendarDays, label: "Trips", key: "bookings" },
  { to: "/saved", Icon: Heart, label: "Saved", key: "saved" },
  { to: "/account", Icon: User, label: "Account", key: "profile" },
];

export const agentTabs: NavTab[] = [
  { to: "/host", Icon: LayoutDashboard, label: "Hosting", key: "dashboard" },
  { to: "/host/listings", Icon: Building2, label: "Listings", key: "listings" },
  { to: "/host/bookings", Icon: ShieldCheck, label: "Bookings", key: "escrow" },
  { to: "/messages", Icon: MessageSquare, label: "Inbox", key: "messages" },
  { to: "/account", Icon: User, label: "Account", key: "profile" },
];

/** Items that live in the Menu drawer rather than the bar. */
export const menuItems = (role: "client" | "agent"): NavTab[] => [
  ...(role === "client" ? [{ to: "/messages", Icon: MessageSquare, label: "Inbox", key: "messages" }] : [
    { to: "/host/requests", Icon: Inbox, label: "Requests", key: "requests" },
    { to: "/host/calendar", Icon: CalendarDays, label: "Calendar", key: "calendar" },
    { to: "/host/payouts", Icon: Wallet, label: "Payouts", key: "payouts" },
  ]),
  { to: "/issues", Icon: LifeBuoy, label: "Your problems", key: "issues" },
  { to: "/reservations", Icon: Clock, label: "Reservations", key: "reservations" },
  { to: "/profile/help", Icon: HelpCircle, label: "Help", key: "help" },
  { to: "/privacy-policy", Icon: Lock, label: "Privacy", key: "privacy" },
  { to: "/terms", Icon: FileText, label: "Terms", key: "terms" },
];

type NotificationLike = { read_at: string | null; type: string };

export const badgeFor = (key: string, items: NotificationLike[]): number => {
  const unread = items.filter((n) => !n.read_at);
  switch (key) {
    case "messages": return unread.filter((n) => n.type === "message").length;
    case "bookings": return unread.filter((n) => n.type === "booking" || n.type === "reservation").length;
    case "escrow":   return unread.filter((n) => n.type === "booking" || n.type === "payout").length;
    case "requests": return unread.filter((n) => n.type === "booking_request").length;
    case "requests": return unread.filter((n) => n.type === "booking_request").length;
    case "listings": return unread.filter((n) => n.type === "listing").length;
    case "profile":  return unread.filter((n) => n.type === "system" || n.type === "kyc").length;
    default: return 0;
  }
};
