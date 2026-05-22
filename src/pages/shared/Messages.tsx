import { TopBar } from "@/components/shell/TopBar";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { User, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Row = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
};

type Profile = { user_id: string; full_name: string | null; avatar_url: string | null };

type Thread = {
  otherId: string;
  name: string;
  avatarUrl: string | null;
  last: string;
  time: string;
  unread: number;
};

const Messages = () => {
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(200);
    const rows = (data as Row[]) || [];

    // Group by other participant
    const byOther = new Map<string, Row[]>();
    for (const r of rows) {
      const other = r.sender_id === user.id ? r.receiver_id : r.sender_id;
      const arr = byOther.get(other) || [];
      arr.push(r);
      byOther.set(other, arr);
    }
    const otherIds = Array.from(byOther.keys());

    let profiles: Profile[] = [];
    if (otherIds.length) {
      const { data: profs } = await supabase.rpc("get_public_profiles", { _user_ids: otherIds });
      profiles = (profs as Profile[]) || [];
    }
    const pmap = new Map(profiles.map((p) => [p.user_id, p]));

    // Unread notifs (type=message) give a rough unread count per sender
    const { data: notifs } = await supabase
      .from("notifications")
      .select("link")
      .eq("user_id", user.id)
      .eq("type", "message")
      .is("read_at", null);
    const unreadBy = new Map<string, number>();
    for (const n of (notifs as { link: string | null }[]) || []) {
      const m = n.link?.match(/\/messages\/([0-9a-f-]+)/);
      if (m) unreadBy.set(m[1], (unreadBy.get(m[1]) || 0) + 1);
    }

    const list: Thread[] = otherIds.map((id) => {
      const arr = byOther.get(id)!;
      const latest = arr[0];
      const p = pmap.get(id);
      return {
        otherId: id,
        name: p?.full_name || "User",
        avatarUrl: p?.avatar_url || null,
        last: latest.content,
        time: formatDistanceToNow(new Date(latest.created_at), { addSuffix: false }),
        unread: unreadBy.get(id) || 0,
      };
    });
    setThreads(list);
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase
      .channel(`msgs-list:${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <>
      <TopBar title="Inbox" subtitle={`${threads.length} conversations`} />
      <main className="px-2 pt-2 pb-8">
        {loading && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            <div className="w-6 h-6 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin mb-2" />
            Loading…
          </div>
        )}
        {!loading && threads.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs mt-1">Message a host from a property page to start.</p>
          </div>
        )}
        {threads.map((t) => (
          <Link
            key={t.otherId}
            to={`/messages/${t.otherId}`}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-card transition-colors text-left"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0 overflow-hidden">
              {t.avatarUrl ? <img src={t.avatarUrl} alt="" className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-primary" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm truncate">{t.name}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">{t.time}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-muted-foreground truncate flex-1">{t.last}</p>
                {t.unread > 0 && (
                  <span className="shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                    {t.unread}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </main>
    </>
  );
};

export default Messages;
