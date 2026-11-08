import { Bell, CheckCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

/** The bell: opens a drop-down of the newest notifications (no separate page). */
export const NotificationsBell = ({ side = "bottom", withLabel = false, className }: { side?: "top" | "bottom" | "left" | "right"; withLabel?: boolean; className?: string }) => {
  const { items, loading, unread, markAllRead, markRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (params.get("notifications") === "1") {
      if (trigger.current?.offsetParent) setOpen(true);
      const next = new URLSearchParams(params); next.delete("notifications");
      setParams(next, { replace: true });
    }
  }, [params, setParams]);

  const pick = (n: (typeof items)[number]) => {
    if (!n.read_at) markRead(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button ref={trigger} aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
          className={cn("relative flex items-center gap-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface",
            withLabel ? "h-11 px-3 w-full text-sm font-semibold" : "w-11 h-11 justify-center rounded-full", className)}>
          <Bell className="w-5 h-5" />{withLabel && <span className="flex-1 text-left">Notifications</span>}
          {unread > 0 && (
            <span className={cn("min-w-[18px] h-[18px] px-1 rounded-full bg-orange text-primary-foreground text-xs font-semibold flex items-center justify-center",
              !withLabel && "absolute top-1 right-0.5")}>{unread > 9 ? "9+" : unread}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent side={side} align="end" collisionPadding={8} className="w-[min(92vw,380px)] p-0 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 h-12 border-b border-border">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && (
            <button onClick={markAllRead} className="h-11 -mr-2 px-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
              <CheckCheck className="w-4 h-4" /> Mark all as read
            </button>
          )}
        </div>
        <div className="max-h-[min(70vh,480px)] overflow-y-auto">
          {loading ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">You're all caught up</p>
          ) : (
            <ul>
              {items.slice(0, 20).map((n) => (
                <li key={n.id}>
                  <button onClick={() => pick(n)} className={cn("w-full text-left flex gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-surface", !n.read_at && "bg-primary/5")}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className={cn("text-sm truncate", !n.read_at && "font-semibold")}>{n.title}</p>
                        <span className="text-xs text-muted-foreground shrink-0">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
                      </div>
                      {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                    </div>
                    {!n.read_at && <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" aria-label="Unread" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
