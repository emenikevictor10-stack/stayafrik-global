import { Bell, Menu, LogOut, Repeat } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { menuItems, badgeFor } from "./navTabs";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Logo } from "@/ui/kit";
import { useNotifications } from "@/hooks/useNotifications";
import { useNavActions } from "./useNavActions";

/** Phone/tablet header (52px). Hidden on PC, where the dock takes over. */
export const TopBar = ({ title }: { title: string; subtitle?: string }) => {
  const { unread, items } = useNotifications();
  const { role, session, toggleRole, logOut, roleLabel } = useNavActions();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="xl:hidden sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border">
      <div className="h-[52px] px-4 flex items-center gap-2">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button className="-ml-2 w-11 h-11 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground relative" aria-label="Open menu">
              <Menu className="w-5 h-5" />
              {badgeFor("messages", items) > 0 && <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-orange" aria-hidden />}
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 flex flex-col">
            <SheetTitle><Logo /></SheetTitle>
            <MenuList onPick={() => setMenuOpen(false)} role={role} items={items} />
            <div className="mt-auto flex flex-col gap-1 border-t border-border pt-4">
              <button onClick={() => { setMenuOpen(false); toggleRole(); }} className="h-11 flex items-center gap-3 rounded-lg px-3 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-surface">
                <Repeat className="w-5 h-5" /> {roleLabel}
              </button>
              {session && (
                <button onClick={() => { setMenuOpen(false); logOut(); }} className="h-11 flex items-center gap-3 rounded-lg px-3 text-sm font-semibold text-destructive hover:bg-destructive/10">
                  <LogOut className="w-5 h-5" /> Log out
                </button>
              )}
            </div>
          </SheetContent>
        </Sheet>
        <Logo className="h-6 shrink-0" />
        <h1 className="text-base font-semibold truncate flex-1 ml-1">{title}</h1>
        <Link to="/notifications" className="relative w-11 h-11 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground" aria-label="Notifications">
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-orange text-primary-foreground text-xs font-semibold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
};

export const MenuList = ({ onPick, role, items }: { onPick?: () => void; role: "client" | "agent"; items: { read_at: string | null; type: string }[] }) => (
  <nav className="flex flex-col gap-1 mt-6" aria-label="Menu">
    {menuItems(role).map(({ to, Icon, label, key }) => {
      const count = badgeFor(key, items);
      return (
        <NavLink key={to} to={to} onClick={onPick}
          className={({ isActive }) => cn("h-11 flex items-center gap-3 rounded-lg px-3 text-sm font-semibold",
            isActive ? "bg-surface text-primary" : "text-muted-foreground hover:text-foreground hover:bg-surface")}>
          <Icon className="w-5 h-5" aria-hidden /> <span className="flex-1">{label}</span>
          {count > 0 && <span className="min-w-[20px] h-5 px-1 rounded-full bg-orange text-primary-foreground text-xs font-semibold flex items-center justify-center">{count > 9 ? "9+" : count}</span>}
        </NavLink>
      );
    })}
  </nav>
);
