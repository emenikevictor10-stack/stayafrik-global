import { TopBar } from "@/components/shell/TopBar";
import { useRole } from "@/contexts/RoleContext";
import { Link } from "react-router-dom";

const clientThreads = [
  { id: 1, name: "Amaka Osei", role: "Verified Agent", emoji: "👩🏾‍💼", last: "Yes, the apartment is available those dates ✓", time: "2m", unread: 1 },
  { id: 2, name: "Kofi Mensah", role: "Verified Agent", emoji: "👨🏾‍💼", last: "I'll send the inspection slot tomorrow.", time: "1h", unread: 0 },
  { id: 3, name: "Stayafrik Support", role: "Concierge", emoji: "🎧", last: "How was your stay in Maitama?", time: "2d", unread: 0 },
];

const agentThreads = [
  { id: 1, name: "Adaeze O.", role: "Client · V.I apt", emoji: "🙋🏾‍♀️", last: "What time can I check in?", time: "5m", unread: 2 },
  { id: 2, name: "Tobi A.", role: "Client · Lekki house", emoji: "🧑🏾", last: "Document received, releasing escrow.", time: "1h", unread: 0 },
  { id: 3, name: "Stayafrik Verify Team", role: "Internal", emoji: "🛡️", last: "Title check complete on SA-PROP-0421.", time: "1d", unread: 1 },
];

const Messages = () => {
  const { role } = useRole();
  const threads = role === "client" ? clientThreads : agentThreads;

  return (
    <>
      <TopBar title="Inbox" subtitle={`${threads.length} conversations`} />
      <main className="px-2 pt-2 pb-8">
        {threads.map((t) => (
          <button
            key={t.id}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-card transition-colors text-left"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-xl shrink-0">
              {t.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm truncate">{t.name}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">{t.time}</span>
              </div>
              <div className="text-[11px] text-primary font-medium">{t.role}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-muted-foreground truncate flex-1">{t.last}</p>
                {t.unread > 0 && (
                  <span className="shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                    {t.unread}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </main>
    </>
  );
};

export default Messages;
