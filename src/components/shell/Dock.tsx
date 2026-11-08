import { useRef, useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { Search, Menu, GripVertical, GripHorizontal, PanelLeft, PanelLeftClose, LogOut, Repeat, Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useRole } from "@/contexts/RoleContext";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { Logo } from "@/ui/kit";
import { clientTabs, agentTabs, badgeFor } from "./navTabs";
import { MenuList } from "./TopBar";
import { useNavPrefs, setDockEdge, setPinned, nearestEdge } from "./navPrefs";
import { useNavActions } from "./useNavActions";

const Dot = () => <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange" aria-hidden />;

/** PC navigation (1280px+): floating dock that snaps to left/right/bottom, or a pinned sidebar. */
export const Dock = () => {
  const { role } = useRole();
  const { items, unread } = useNotifications();
  const { session, toggleRole, logOut, roleLabel } = useNavActions();
  const { edge, pinned } = useNavPrefs();
  const navigate = useNavigate();
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const tabs = role === "client" ? clientTabs : agentTabs;
  const horizontal = edge === "bottom";

  const onDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY };
  };
  const onMove = (e: React.PointerEvent) => { if (start.current) setDrag({ x: e.clientX, y: e.clientY }); };
  const onUp = (e: React.PointerEvent) => {
    if (start.current && drag) setDockEdge(nearestEdge(e.clientX, e.clientY, window.innerWidth, window.innerHeight));
    start.current = null; setDrag(null);
  };

  const menu = (
    <Popover>
      <PopoverTrigger asChild>
        <button className={cn("relative flex items-center gap-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface", pinned ? "h-11 px-3 w-full text-sm font-semibold" : "w-11 h-11 justify-center")} aria-label="Menu">
          <Menu className="w-5 h-5" />{pinned && "Menu"}
          {!pinned && badgeFor("messages", items) > 0 && <Dot />}
        </button>
      </PopoverTrigger>
      <PopoverContent side={horizontal && !pinned ? "top" : edge === "left" || pinned ? "right" : "left"} className="w-64 p-2 rounded-xl">
        <div className="-mt-6"><MenuList role={role} items={items} /></div>
        <div className="border-t border-border mt-2 pt-2 flex flex-col gap-1">
          <Link to="/notifications" className="h-11 flex items-center gap-3 rounded-lg px-3 text-sm font-semibold text-muted-foreground hover:bg-surface hover:text-foreground">
            <Bell className="w-5 h-5" /> <span className="flex-1">Notifications</span>{unread > 0 && <span className="text-xs text-orange">{unread}</span>}
          </Link>
          <button onClick={() => setPinned(!pinned)} className="h-11 flex items-center gap-3 rounded-lg px-3 text-sm font-semibold text-muted-foreground hover:bg-surface hover:text-foreground">
            {pinned ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />} {pinned ? "Unpin sidebar" : "Pin sidebar"}
          </button>
          <button onClick={toggleRole} className="h-11 flex items-center gap-3 rounded-lg px-3 text-sm font-semibold text-muted-foreground hover:bg-surface hover:text-foreground">
            <Repeat className="w-5 h-5" /> {roleLabel}
          </button>
          {session && (
            <button onClick={logOut} className="h-11 flex items-center gap-3 rounded-lg px-3 text-sm font-semibold text-destructive hover:bg-destructive/10">
              <LogOut className="w-5 h-5" /> Log out
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );

  if (pinned) {
    return (
      <aside className="hidden xl:flex fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-border bg-background p-4" aria-label="Primary">
        <Logo className="h-8 self-start mb-5" />
        <button onClick={() => navigate("/explore")} className="h-11 mb-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-blue-hover">
          <Search className="w-4 h-4" /> Search
        </button>
        <nav className="flex flex-col gap-1">
          {tabs.map(({ to, Icon, label, key }) => (
            <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => cn("h-11 flex items-center gap-3 rounded-lg px-3 text-sm font-semibold", isActive ? "bg-surface text-primary" : "text-muted-foreground hover:bg-surface hover:text-foreground")}>
              <Icon className="w-5 h-5" /> <span className="flex-1">{label}</span>
              {badgeFor(key, items) > 0 && <span className="w-2 h-2 rounded-full bg-orange" />}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto">{menu}</div>
      </aside>
    );
  }

  const pos = drag
    ? { left: drag.x - 32, top: drag.y - 20 }
    : undefined;

  return (
    <nav aria-label="Primary" style={pos}
      className={cn("hidden xl:flex fixed z-40 items-center gap-1 p-2 rounded-2xl border border-border bg-background shadow-search-open",
        drag ? "opacity-90" : horizontal ? "bottom-4 left-1/2 -translate-x-1/2 flex-row" : cn("top-1/2 -translate-y-1/2 flex-col", edge === "left" ? "left-4" : "right-4"),
        drag && !horizontal && "flex-col")}>
      <button onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
        className="w-11 h-6 flex items-center justify-center text-off cursor-grab active:cursor-grabbing touch-none" aria-label="Drag to move the menu" title="Drag to the left, right or bottom">
        {horizontal ? <GripVertical className="w-4 h-4" /> : <GripHorizontal className="w-4 h-4" />}
      </button>
      <Link to="/" aria-label="Stay home" className="w-11 h-11 flex items-center justify-center"><Logo className="h-5" /></Link>
      <button onClick={() => navigate("/explore")} className="w-11 h-11 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-blue-hover" aria-label="Search" title="Search">
        <Search className="w-5 h-5" />
      </button>
      {tabs.map(({ to, Icon, label, key }) => (
        <NavLink key={to} to={to} end={to === "/"} title={label} aria-label={label}
          className={({ isActive }) => cn("relative w-11 h-11 rounded-lg flex items-center justify-center", isActive ? "bg-surface text-primary" : "text-muted-foreground hover:bg-surface hover:text-foreground")}>
          <Icon className="w-5 h-5" />
          {badgeFor(key, items) > 0 && <Dot />}
        </NavLink>
      ))}
      {menu}
    </nav>
  );
};
