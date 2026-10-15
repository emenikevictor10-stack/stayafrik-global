import {
  Search,
  CalendarDays,
  MessageSquare,
  User,
  LayoutDashboard,
  Building2,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export type NavTab = { to: string; Icon: LucideIcon; label: string; key: string };

export const clientTabs: NavTab[] = [
  { to: "/", Icon: Search, label: "Explore", key: "explore" },
  { to: "/bookings", Icon: CalendarDays, label: "Bookings", key: "bookings" },
  { to: "/messages", Icon: MessageSquare, label: "Inbox", key: "messages" },
  { to: "/profile", Icon: User, label: "Profile", key: "profile" },
];

export const agentTabs: NavTab[] = [
  { to: "/", Icon: LayoutDashboard, label: "Dashboard", key: "dashboard" },
  { to: "/listings", Icon: Building2, label: "Listings", key: "listings" },
  { to: "/escrow", Icon: ShieldCheck, label: "Escrow", key: "escrow" },
  { to: "/messages", Icon: MessageSquare, label: "Inbox", key: "messages" },
  { to: "/profile", Icon: User, label: "Profile", key: "profile" },
];

type NotificationLike = { read_at: string | null; type: string };

export const badgeFor = (key: string, items: NotificationLike[]): number => {
  const unread = items.filter((n) => !n.read_at);
  switch (key) {
    case "messages": return unread.filter((n) => n.type === "message").length;
    case "bookings": return unread.filter((n) => n.type === "booking" || n.type === "reservation").length;
    case "escrow":   return unread.filter((n) => n.type === "booking" || n.type === "payout").length;
    case "listings": return unread.filter((n) => n.type === "listing").length;
    case "profile":  return unread.filter((n) => n.type === "system" || n.type === "kyc").length;
    default: return 0;
  }
};
