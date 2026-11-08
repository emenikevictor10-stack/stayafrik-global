import { NavLink, Outlet, Link } from "react-router-dom";
import {
  LayoutDashboard, Building2, Users, CalendarDays, Banknote, ShieldCheck, ScrollText, LogOut, Home,
  Handshake, MapPinned, Star, LifeBuoy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useSupportQueueCount } from "@/hooks/useSupportQueueCount";

const NAV = [
  { to: "/admin", label: "Overview", Icon: LayoutDashboard, end: true },
  { to: "/admin/listings", label: "Listings", Icon: Building2 },
  { to: "/admin/users", label: "Users", Icon: Users },
  { to: "/admin/bookings", label: "Bookings", Icon: CalendarDays },
  { to: "/admin/support", label: "Support", Icon: LifeBuoy },
  { to: "/admin/partner-bookings", label: "Partner bookings", Icon: Handshake },
  { to: "/admin/reservations", label: "Viewings", Icon: CalendarDays },
  { to: "/admin/reviews", label: "Reviews", Icon: Star },
  { to: "/admin/payouts", label: "Payouts", Icon: Banknote },
  { to: "/admin/kyc", label: "KYC", Icon: ShieldCheck },
  { to: "/admin/location-audit", label: "Location audit", Icon: MapPinned },
  { to: "/admin/audit", label: "Audit log", Icon: ScrollText },
];

export const AdminLayout = () => {
  const { profile, signOut } = useAuth();
  const support = useSupportQueueCount();
  const badge = (to: string) =>
    to === "/admin/support" && support.waiting > 0 ? (
      <span className={cn("ml-auto text-[12px] font-semibold", support.overdue ? "text-destructive" : "text-warning")}
        aria-label={`${support.waiting} waiting${support.overdue ? `, ${support.overdue} overdue` : ""}`}>{support.waiting}</span>
    ) : null;
  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-card">
        <div className="px-5 py-5 border-b border-border">
          <p className="text-xs font-bold text-muted-foreground">Stay</p>
          <p className="text-base font-extrabold">Admin Console</p>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {NAV.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )
              }
            >
              <Icon className="w-4 h-4" /> {label}{badge(to)}
            </NavLink>
          ))}
        </nav>
        <div className="p-2 border-t border-border space-y-1">
          <Link to="/" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary">
            <Home className="w-4 h-4" /> Exit to app
          </Link>
          <button onClick={signOut} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
          <p className="px-3 pt-1 text-xs text-muted-foreground truncate">{profile?.email}</p>
        </div>
      </aside>

      {/* Mobile top nav */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex overflow-x-auto px-3 py-2 gap-1 no-scrollbar">
          {NAV.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap",
                  isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
                )
              }
            >
              <Icon className="w-3.5 h-3.5" /> {label}{badge(to)}
            </NavLink>
          ))}
        </div>
      </div>

      <main className="flex-1 min-w-0 pt-14 md:pt-0">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-6 md:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
