import { TopBar } from "@/components/shell/TopBar";
import { useNotifications } from "@/hooks/useNotifications";
import { Link } from "react-router-dom";
import { Bell, CheckCheck, BellOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const Notifications = () => {
  const { items, loading, unread, markAllRead, markRead } = useNotifications();

  return (
    <>
      <TopBar title="Notifications" subtitle={unread ? `${unread} unread` : "All caught up"} />
      <main className="px-4 pt-3 pb-8">
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="mb-3 w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-bold py-2.5"
          >
            <CheckCheck className="w-3.5 h-3.5" /> Mark all as read
          </button>
        )}

        {loading && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            <div className="w-6 h-6 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin mb-2" />
            Loading…
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <BellOff className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No notifications yet</p>
            <p className="text-xs mt-1">We'll let you know when something happens.</p>
          </div>
        )}

        <ul className="space-y-2">
          {items.map((n) => {
            const Wrapper: any = n.link ? Link : "div";
            return (
              <li key={n.id}>
                <Wrapper
                  {...(n.link ? { to: n.link } : {})}
                  onClick={() => !n.read_at && markRead(n.id)}
                  className={`flex gap-3 rounded-2xl border p-3.5 ${n.read_at ? "bg-card border-border" : "bg-primary/5 border-primary/30"}`}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-bold truncate">{n.title}</div>
                      <div className="text-xs text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </div>
                    </div>
                    {n.body && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</div>}
                  </div>
                  {!n.read_at && <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />}
                </Wrapper>
              </li>
            );
          })}
        </ul>
      </main>
    </>
  );
};

export default Notifications;
