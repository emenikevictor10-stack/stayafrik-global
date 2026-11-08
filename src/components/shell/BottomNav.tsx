import { NavLink, useLocation, matchPath } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { clientTabs, agentTabs, badgeFor } from "./navTabs";

export const BottomNav = () => {
  const { role } = useRole();
  const { pathname } = useLocation();
  const { items } = useNotifications();
  if (matchPath("/messages/:id", pathname)) return null;
  const tabs = role === "client" ? clientTabs : agentTabs;

  return (
    <nav
      className="xl:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl safe-bottom"
      aria-label="Primary"
    >
      <ul
        className={cn(
          "max-w-xl mx-auto grid grid-cols-5 h-[58px]",
        )}
      >
        {tabs.map(({ to, Icon, label, key }) => {
          const count = badgeFor(key, items);
          return (
            <li key={to}>
              <NavLink
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  cn(
                    "h-[58px] flex flex-col items-center justify-center gap-0.5 text-xs font-semibold transition-colors relative",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )
                }
              >
                <span className="relative">
                  <Icon className="w-5 h-5" aria-hidden />
                  {count > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center border border-background">
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
