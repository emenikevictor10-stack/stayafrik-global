import {
  LayoutDashboard, Building2, Users, CalendarDays, Banknote, ShieldCheck, ScrollText,
  Handshake, MapPinned, Star, LifeBuoy, Eye, Settings, Home, Gift, CalendarClock, Wallet, Mail, Activity, BarChart3, UserCog,
  Landmark, BookOpen,
} from "lucide-react";

export type AdminCountKey = "support" | "listings" | "kyc" | "payouts" | "viewings" | "partner" | "transfers";

export type TeamRole = "admin" | "support" | "finance" | "listings";
export const TEAM_ROLES: { role: TeamRole; label: string; hint: string }[] = [
  { role: "admin", label: "Admin", hint: "Everything, including Team and Settings" },
  { role: "support", label: "Support", hint: "Guest problems, bookings, viewings, messages, date changes, add-ons" },
  { role: "finance", label: "Finance", hint: "Payments, payouts, refunds, insights" },
  { role: "listings", label: "Listings", hint: "Listing approvals, reviews, location audit, ID review, hosts" },
];

/** Roles allowed per item; admin always allowed. Omit = any team member. */
export type AdminNavItem = { to: string; label: string; Icon: typeof Users; end?: boolean; count?: AdminCountKey; roles?: TeamRole[] };

/** Admin sections, grouped. Defined once for PC sidebar and phone menu. */
export const ADMIN_NAV: { group: string; items: AdminNavItem[] }[] = [
  { group: "Today", items: [
    { to: "/admin", label: "Overview", Icon: LayoutDashboard, end: true },
    { to: "/admin/support", label: "Support", Icon: LifeBuoy, count: "support", roles: ["support"] },
    { to: "/admin/bookings", label: "Bookings", Icon: CalendarDays, roles: ["support", "finance"] },
    { to: "/admin/reservations", label: "Viewings", Icon: Eye, count: "viewings", roles: ["support"] },
    { to: "/admin/date-changes", label: "Date changes", Icon: CalendarClock, roles: ["support"] },
    { to: "/admin/addons", label: "Add-ons", Icon: Gift, roles: ["support"] },
  ] },
  { group: "Stays", items: [
    { to: "/admin/listings", label: "Listings", Icon: Building2, count: "listings", roles: ["listings"] },
    { to: "/admin/partner-bookings", label: "Partner bookings", Icon: Handshake, count: "partner", roles: ["support"] },
    { to: "/admin/reviews", label: "Reviews", Icon: Star, roles: ["listings"] },
    { to: "/admin/guides", label: "Guides", Icon: BookOpen, roles: ["support", "listings"] },
    { to: "/admin/location-audit", label: "Location audit", Icon: MapPinned, roles: ["listings"] },
  ] },
  { group: "People", items: [
    { to: "/admin/users", label: "Users", Icon: Users, roles: ["support", "listings"] },
    { to: "/admin/hosts", label: "Hosts", Icon: Home, roles: ["listings", "finance"] },
    { to: "/admin/kyc", label: "ID review", Icon: ShieldCheck, count: "kyc", roles: ["listings"] },
  ] },
  { group: "Team", items: [
    { to: "/admin/team", label: "Team", Icon: UserCog, roles: [] },
  ] },
  { group: "Money", items: [
    { to: "/admin/payments", label: "Payments", Icon: Wallet, roles: ["finance"] },
    { to: "/admin/bank-transfers", label: "Bank transfers", Icon: Landmark, count: "transfers", roles: ["finance"] },
    { to: "/admin/payouts", label: "Payouts", Icon: Banknote, count: "payouts", roles: ["finance"] },
    { to: "/admin/insights", label: "Insights", Icon: BarChart3, roles: ["finance"] },
  ] },
  { group: "System", items: [
    { to: "/admin/health", label: "Health", Icon: Activity, roles: [] },
    { to: "/admin/messages", label: "Messages", Icon: Mail, roles: ["support"] },
    { to: "/admin/audit", label: "Audit log", Icon: ScrollText, roles: [] },
    { to: "/admin/settings", label: "Settings", Icon: Settings, roles: [] },
  ] },
];

export const adminTitleFor = (pathname: string) => {
  const all = ADMIN_NAV.flatMap((g) => g.items);
  const hit = all.filter((i) => (i.end ? pathname === i.to : pathname.startsWith(i.to))).sort((a, b) => b.to.length - a.to.length)[0];
  return hit?.label ?? "Admin";
};

export const canSee = (item: Pick<AdminNavItem, "roles">, roles: string[]) =>
  roles.includes("admin") || !item.roles || item.roles.some((r) => roles.includes(r));

/** Nav filtered to what these roles can open; empty groups dropped. */
export const navFor = (roles: string[]) =>
  ADMIN_NAV.map((g) => ({ ...g, items: g.items.filter((i) => canSee(i, roles)) })).filter((g) => g.items.length);

/** Can these roles open this admin path? Sub-paths follow their section. */
export const canOpen = (pathname: string, roles: string[]) => {
  const all = ADMIN_NAV.flatMap((g) => g.items);
  const hit = all.filter((i) => (i.end ? pathname === i.to : pathname === i.to || pathname.startsWith(i.to + "/"))).sort((a, b) => b.to.length - a.to.length)[0];
  if (!hit) return roles.includes("admin");
  return canSee(hit, roles);
};

export const isTeamRole = (r: string): r is TeamRole => TEAM_ROLES.some((t) => t.role === r);
