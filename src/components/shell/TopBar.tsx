import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, User, Briefcase, Menu, LogOut } from "lucide-react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { clientTabs, agentTabs, badgeFor } from "./navTabs";
import { cn } from "@/lib/utils";
import { useState } from "react";
import icon from "@/assets/stay-icon-white.png";
import iconAlt from "@/assets/stay-icon-white.png";
import { useNotifications } from "@/hooks/useNotifications";

export const TopBar = ({ title, subtitle }: { title: string; subtitle?: string }) => {
  const { user, role, setRole } = useRole();
  const { profile, session, signOut } = useAuth();
  const { unread, items } = useNotifications();
  const [menuOpen, setMenuOpen] = useState(false);
  const tabs = role === "client" ? clientTabs : agentTabs;
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/";
  const RoleIcon = role === "client" ? User : Briefcase;
  const toggleRole = () => {
    if (role === "client") {
      if (!session) return navigate("/auth?mode=signin", { state: { from: "/become-host" } });
      if (!profile?.is_host) return navigate("/become-host");
      setRole("agent");
      navigate("/listings");
    } else {
      setRole("client");
      navigate("/");
    }
  };
  return (
    <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border">
      <div className="px-5 pt-4 pb-3 flex items-center gap-3">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button className="lg:hidden -ml-1 w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary" aria-label="Open menu">
              <Menu className="w-5 h-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 flex flex-col">
            <SheetTitle className="flex items-center gap-2">
              <img src={icon} alt="" className="h-7 w-auto" /> Stay
            </SheetTitle>
            <nav className="flex flex-col gap-1 mt-6" aria-label="Menu">
              {tabs.map(({ to, Icon, label, key }) => {
                const count = badgeFor(key, items);
                return (
                  <NavLink key={to} to={to} end onClick={() => setMenuOpen(false)}
                    className={({ isActive }) => cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold",
                      isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary")}>
                    <Icon className="w-5 h-5" aria-hidden /> <span className="flex-1">{label}</span>
                    {count > 0 && <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">{count > 9 ? "9+" : count}</span>}
                  </NavLink>
                );
              })}
            </nav>
            <div className="mt-auto flex flex-col gap-1 border-t border-border pt-4">
              <button onClick={() => { setMenuOpen(false); toggleRole(); }} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary">
                <RoleIcon className="w-5 h-5" /> Switch to {role === "client" ? "Agent" : "Client"}
              </button>
              {session && (
                <button onClick={async () => { setMenuOpen(false); await signOut(); navigate("/"); }} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10">
                  <LogOut className="w-5 h-5" /> Log out
                </button>
              )}
            </div>
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2 flex-1 lg:flex-none min-w-0">
          <img src={isHome ? icon : iconAlt} alt="Stay" className="h-7 w-auto shrink-0 object-contain" />
          <div className="min-w-0">
            <h1 className="text-[15px] font-bold leading-tight truncate lg:hidden">{title}</h1>
            <span className="hidden lg:inline text-lg font-extrabold tracking-tight">Stay</span>
          </div>
        </div>
        <nav className="hidden lg:flex flex-1 items-center justify-center gap-1" aria-label="Primary">
          {tabs.map(({ to, Icon, label, key }) => {
            const count = badgeFor(key, items);
            return (
              <NavLink key={to} to={to} end
                className={({ isActive }) => cn("relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary")}>
                <Icon className="w-4 h-4" aria-hidden /> {label}
                {count > 0 && <span className="min-w-[16px] h-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">{count > 9 ? "9+" : count}</span>}
              </NavLink>
            );
          })}
        </nav>
        <button
          onClick={toggleRole}
          className="hidden lg:inline-flex text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1.5 rounded-full bg-secondary border border-border text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors items-center gap-1"
          aria-label="Switch role"
        >
          <RoleIcon className="w-3 h-3" /> {role === "client" ? "Client" : "Agent"}
        </button>
        <Link
          to="/notifications"
          className="relative w-9 h-9 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-primary"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center border-2 border-background">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>
        <Link
          to="/profile"
          className="w-9 h-9 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-xs font-bold text-primary overflow-hidden"
          aria-label={user.name}
        >
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            user.initials
          )}
        </Link>
      </div>
    </header>
  );
};
