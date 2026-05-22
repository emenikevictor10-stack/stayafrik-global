import { useRole } from "@/contexts/RoleContext";
import { Bell, User, Briefcase } from "lucide-react";
import { Link } from "react-router-dom";
import icon from "@/assets/stay-icon.png";
import { useNotifications } from "@/hooks/useNotifications";

export const TopBar = ({ title, subtitle }: { title: string; subtitle?: string }) => {
  const { user, role, setRole } = useRole();
  const { unread } = useNotifications();
  const RoleIcon = role === "client" ? User : Briefcase;
  return (
    <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border">
      <div className="px-5 pt-4 pb-3 flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <img src={icon} alt="Stay" className="h-7 w-auto shrink-0" width={56} height={28} />
          <div className="min-w-0">
            <h1 className="text-[15px] font-bold leading-tight truncate">{title}</h1>
            {subtitle && <p className="text-[10px] text-muted-foreground truncate">{subtitle}</p>}
          </div>
        </div>
        <button
          onClick={() => setRole(role === "client" ? "agent" : "client")}
          className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1.5 rounded-full bg-secondary border border-border text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors inline-flex items-center gap-1"
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
