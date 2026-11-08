import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { LogOut, Home, Menu, PanelLeftClose, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminCounts } from "@/hooks/useAdminCounts";
import { ADMIN_NAV, adminTitleFor, type AdminCountKey } from "./adminNav";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const RAIL_KEY = "sg-admin-rail";

const Nav = ({ rail, counts, overdue, onPick }: { rail?: boolean; counts: Record<AdminCountKey, number>; overdue: number; onPick?: () => void }) => (
  <nav className="flex-1 overflow-y-auto p-2" aria-label="Admin sections">
    {ADMIN_NAV.map(({ group, items }) => (
      <div key={group} className="mb-3">
        {!rail && <p className="px-3 pt-2 pb-1 text-xs font-semibold text-muted-foreground">{group}</p>}
        {rail && <div className="mx-3 my-2 border-t border-border" />}
        {items.map(({ to, label, Icon, end, count }) => {
          const n = count ? counts[count] : 0;
          const urgent = count === "support" && overdue > 0;
          return (
            <NavLink key={to} to={to} end={end} onClick={onPick} title={rail ? label : undefined}
              className={({ isActive }) => cn("relative h-11 flex items-center gap-2.5 rounded-lg text-sm font-semibold transition-colors",
                rail ? "justify-center px-0" : "px-3",
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-surface hover:text-foreground")}>
              <Icon className="w-5 h-5 shrink-0" aria-hidden />
              {!rail && <span className="flex-1 truncate">{label}</span>}
              {n > 0 && (rail
                ? <span className={cn("absolute top-2 right-3 w-2 h-2 rounded-full", urgent ? "bg-destructive" : "bg-orange")} aria-label={`${n} waiting`} />
                : <span className="inline-flex items-center gap-1.5 text-xs" aria-label={`${n} waiting`}>
                    <span className={cn("w-2 h-2 rounded-full", urgent ? "bg-destructive" : "bg-orange")} />{n > 99 ? "99+" : n}
                  </span>)}
            </NavLink>
          );
        })}
      </div>
    ))}
  </nav>
);

const Account = ({ rail, email, signOut }: { rail?: boolean; email?: string | null; signOut: () => void }) => (
  <div className="p-2 border-t border-border space-y-1">
    <Link to="/" title="Back to StayGlobal" className={cn("h-11 flex items-center gap-2.5 rounded-lg text-sm font-semibold text-muted-foreground hover:bg-surface", rail ? "justify-center" : "px-3")}>
      <Home className="w-5 h-5" /> {!rail && "Back to StayGlobal"}
    </Link>
    <button onClick={signOut} title="Sign out" className={cn("w-full h-11 flex items-center gap-2.5 rounded-lg text-sm font-semibold text-muted-foreground hover:bg-surface", rail ? "justify-center" : "px-3")}>
      <LogOut className="w-5 h-5" /> {!rail && "Sign out"}
    </button>
    {!rail && <p className="px-3 pt-1 text-xs text-muted-foreground truncate">{email}</p>}
  </div>
);

export const AdminLayout = () => {
  const { profile, signOut } = useAuth();
  const { counts, overdue } = useAdminCounts();
  const { pathname } = useLocation();
  const [rail, setRail] = useState(() => localStorage.getItem(RAIL_KEY) === "1");
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRail = () => { setRail((r) => { localStorage.setItem(RAIL_KEY, r ? "0" : "1"); return !r; }); };
  const waiting = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <aside className={cn("hidden md:flex sticky top-0 h-screen shrink-0 flex-col border-r border-border bg-card transition-[width]", rail ? "w-[72px]" : "w-[248px]")}>
        <div className={cn("h-16 flex items-center border-b border-border", rail ? "justify-center" : "px-4 justify-between")}>
          {!rail && <div><p className="text-xs font-semibold text-muted-foreground">Stay</p><p className="text-base font-semibold">Admin console</p></div>}
          <button onClick={toggleRail} className="w-11 h-11 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-surface" aria-label={rail ? "Expand sidebar" : "Collapse sidebar"}>
            {rail ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
        </div>
        <Nav rail={rail} counts={counts} overdue={overdue} />
        <Account rail={rail} email={profile?.email} signOut={signOut} />
      </aside>

      <header className="md:hidden fixed top-0 inset-x-0 z-30 h-[52px] bg-background/95 backdrop-blur border-b border-border flex items-center gap-2 px-2">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button className="relative w-11 h-11 rounded-full flex items-center justify-center text-muted-foreground" aria-label="Open admin menu">
              <Menu className="w-5 h-5" />
              {waiting > 0 && <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-orange" aria-hidden />}
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 flex flex-col">
            <SheetTitle className="px-5 pt-5 pb-2 text-base font-semibold">Admin console</SheetTitle>
            <Nav counts={counts} overdue={overdue} onPick={() => setMenuOpen(false)} />
            <Account email={profile?.email} signOut={signOut} />
          </SheetContent>
        </Sheet>
        <h1 className="text-base font-semibold truncate">{adminTitleFor(pathname)}</h1>
      </header>

      <main className="flex-1 min-w-0 pt-[52px] md:pt-0">
        <div className="max-w-[1240px] mx-auto px-5 md:px-8 py-6 md:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
