import {
  LayoutDashboard, Building2, Users, CalendarDays, Banknote, ShieldCheck, ScrollText,
  Handshake, MapPinned, Star, LifeBuoy, Eye, Settings,
} from "lucide-react";

export type AdminCountKey = "support" | "listings" | "kyc" | "payouts" | "viewings" | "partner";

export type AdminNavItem = { to: string; label: string; Icon: typeof Users; end?: boolean; count?: AdminCountKey };

/** Admin sections, grouped. Defined once for PC sidebar and phone menu. */
export const ADMIN_NAV: { group: string; items: AdminNavItem[] }[] = [
  { group: "Today", items: [
    { to: "/admin", label: "Overview", Icon: LayoutDashboard, end: true },
    { to: "/admin/support", label: "Support", Icon: LifeBuoy, count: "support" },
    { to: "/admin/bookings", label: "Bookings", Icon: CalendarDays },
    { to: "/admin/reservations", label: "Viewings", Icon: Eye, count: "viewings" },
  ] },
  { group: "Stays", items: [
    { to: "/admin/listings", label: "Listings", Icon: Building2, count: "listings" },
    { to: "/admin/partner-bookings", label: "Partner bookings", Icon: Handshake, count: "partner" },
    { to: "/admin/reviews", label: "Reviews", Icon: Star },
    { to: "/admin/location-audit", label: "Location audit", Icon: MapPinned },
  ] },
  { group: "People", items: [
    { to: "/admin/users", label: "Users", Icon: Users },
    { to: "/admin/kyc", label: "ID review", Icon: ShieldCheck, count: "kyc" },
    { to: "/admin/payouts", label: "Payouts", Icon: Banknote, count: "payouts" },
  ] },
  { group: "System", items: [
    { to: "/admin/audit", label: "Audit log", Icon: ScrollText },
    { to: "/admin/settings", label: "Settings", Icon: Settings },
  ] },
];

export const adminTitleFor = (pathname: string) => {
  const all = ADMIN_NAV.flatMap((g) => g.items);
  const hit = all.filter((i) => (i.end ? pathname === i.to : pathname.startsWith(i.to))).sort((a, b) => b.to.length - a.to.length)[0];
  return hit?.label ?? "Admin";
};
