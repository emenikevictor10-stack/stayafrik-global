import { NavLink, useLocation, matchPath } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import {
  Search,
  CalendarDays,
  MessageSquare,
  User,
  LayoutDashboard,
  Building2,
  ShieldCheck,
} from "lucide-react";

const clientTabs = [
  { to: "/", Icon: Search, label: "Explore", key: "explore" },
  { to: "/bookings", Icon: CalendarDays, label: "Bookings", key: "bookings" },
  { to: "/messages", Icon: MessageSquare, label: "Inbox", key: "messages" },
  { to: "/profile", Icon: User, label: "Profile", key: "profile" },
];

const agentTabs = [
  { to: "/", Icon: LayoutDashboard, label: "Dashboard", key: "dashboard" },
  { to: "/listings", Icon: Building2, label: "Listings", key: "listings" },
  { to: "/escrow", Icon: ShieldCheck, label: "Escrow", key: "escrow" },
  { to: "/messages", Icon: MessageSquare, label: "Inbox", key: "messages" },
  { to: "/profile", Icon: User, label: "Profile", key: "profile" },
];

export const BottomNav = () => {
  const { role } = useRole();
  const { pathname } = useLocation();
  const { items } = useNotifications();
  if (matchPath("/messages/:id", pathname)) return null;
  const tabs = role === "client" ? clientTabs : agentTabs;

  const badgeFor = (key: string): number => {
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

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl safe-bottom"
      aria-label="Primary"
    >
      <ul
        className={cn(
          "max-w-md mx-auto grid",
          role === "client" ? "grid-cols-4" : "grid-cols-5",
        )}
      >
        {tabs.map(({ to, Icon, label, key }) => {
          const count = badgeFor(key);
          return (
            <li key={to}>
              <NavLink
                to={to}
                end
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors relative",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )
                }
              >
                <span className="relative">
                  <Icon className="w-5 h-5" aria-hidden />
                  {count > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center border border-background">
                      {count > 9 ? "9+" : count}
                    </span>
                  )}
                </span>
                <span>{label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

