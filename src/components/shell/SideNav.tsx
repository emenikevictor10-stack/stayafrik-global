import { NavLink, useLocation, matchPath } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { clientTabs, agentTabs, badgeFor } from "./navTabs";
import { Logo } from "@/ui/kit";

export const SideNav = () => {
  const { role } = useRole();
  const { pathname } = useLocation();
  const { items } = useNotifications();
  if (matchPath("/messages/:id", pathname)) return null;
  const tabs = role === "client" ? clientTabs : agentTabs;

  return (
    <nav
      className="hidden md:flex fixed inset-y-0 left-0 z-40 w-60 flex-col border-r border-border bg-background/95 backdrop-blur-xl px-4 py-6"
      aria-label="Primary"
    >
      <div className="flex items-center gap-2 px-2 mb-8">
        <Logo className="h-8" />
        <span className="text-lg font-extrabold tracking-tight">Stay</span>
      </div>
      <ul className="flex flex-col gap-1">
        {tabs.map(({ to, Icon, label, key }) => {
          const count = badgeFor(key, items);
          return (
            <li key={to}>
              <NavLink
                to={to}
                end
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary",
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
                {label}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
