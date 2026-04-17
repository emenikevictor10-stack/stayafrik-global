import { NavLink } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { cn } from "@/lib/utils";

const clientTabs = [
  { to: "/", emoji: "🏠", label: "Home" },
  { to: "/explore", emoji: "🔎", label: "Explore" },
  { to: "/bookings", emoji: "🗓️", label: "Bookings" },
  { to: "/messages", emoji: "💬", label: "Inbox" },
  { to: "/profile", emoji: "👤", label: "Profile" },
];

const agentTabs = [
  { to: "/", emoji: "📊", label: "Dashboard" },
  { to: "/listings", emoji: "🏘️", label: "Listings" },
  { to: "/escrow", emoji: "🔐", label: "Escrow" },
  { to: "/messages", emoji: "💬", label: "Inbox" },
  { to: "/profile", emoji: "👤", label: "Profile" },
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
        {tabs.map((t) => (
          <li key={t.to}>
            <NavLink
              to={t.to}
              end
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              <span className="text-xl leading-none" aria-hidden>
                {t.emoji}
              </span>
              <span>{t.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};
