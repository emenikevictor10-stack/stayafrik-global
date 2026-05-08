import { useRole } from "@/contexts/RoleContext";
import { Bell } from "lucide-react";
import icon from "@/assets/stay-icon.png";

export const TopBar = ({ title, subtitle }: { title: string; subtitle?: string }) => {
  const { user, role, setRole } = useRole();
  return (
    <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border">
      <div className="px-5 pt-4 pb-3 flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <img src={icon} alt="Stay" className="h-7 w-7 rounded-md shrink-0" width={28} height={28} />
          <div className="min-w-0">
            <h1 className="text-[15px] font-bold leading-tight truncate">{title}</h1>
          </div>
        </div>
        <button
          onClick={() => setRole(role === "client" ? "agent" : "client")}
          className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1.5 rounded-full bg-secondary border border-border text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
          aria-label="Switch role"
        >
          {role === "client" ? "👤 Client" : "🧑‍💼 Agent"}
        </button>
        <button
          className="w-9 h-9 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-primary"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
        </button>
        <div
          className="w-9 h-9 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-base"
          aria-label={user.name}
        >
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
          ) : user.emoji}
        </div>
      </div>
    </header>
  );
};
