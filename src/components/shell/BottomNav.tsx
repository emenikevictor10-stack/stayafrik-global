import { NavLink } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { cn } from "@/lib/utils";
import {
  Home,
  Search,
  CalendarDays,
  MessageSquare,
  User,
  LayoutDashboard,
  Building2,
  ShieldCheck,
} from "lucide-react";

const clientTabs = [
  { to: "/", Icon: Home, label: "Home" },
  { to: "/explore", Icon: Search, label: "Explore" },
  { to: "/bookings", Icon: CalendarDays, label: "Bookings" },
  { to: "/messages", Icon: MessageSquare, label: "Inbox" },
  { to: "/profile", Icon: User, label: "Profile" },
];

const agentTabs = [
  { to: "/", Icon: LayoutDashboard, label: "Dashboard" },
  { to: "/listings", Icon: Building2, label: "Listings" },
  { to: "/escrow", Icon: ShieldCheck, label: "Escrow" },
  { to: "/messages", Icon: MessageSquare, label: "Inbox" },
  { to: "/profile", Icon: User, label: "Profile" },
];

export const BottomNav = () => {
  const { role } = useRole();
  const tabs = role === "client" ? clientTabs : agentTabs;
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl safe-bottom"
      aria-label="Primary"
    >
      <ul className="grid grid-cols-5 max-w-md mx-auto">
        {tabs.map(({ to, Icon, label }) => (
          <li key={to}>
            <NavLink
              to={to}
              end
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              <Icon className="w-5 h-5" aria-hidden />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};
