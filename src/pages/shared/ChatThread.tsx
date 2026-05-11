import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { ChevronLeft, Send, Phone, Paperclip, Image, User, BadgeCheck } from "lucide-react";
import { PROPERTIES } from "@/data/properties";

type Msg = { id: number; from: "me" | "them"; text: string; time: string };

const ChatThread = () => {
  const { agentId } = useParams();
  const [params] = useSearchParams();
  const propId = params.get("prop");
  const navigate = useNavigate();
  const prop = propId ? PROPERTIES.find((p) => p.id === propId) : undefined;
  const agent = prop || PROPERTIES.find((p) => p.agent.toLowerCase().replace(/\s+/g, "-") === agentId);
  const name = agent?.agent || "Stay Agent";
  const tag = agent?.agentTag || "Verified Agent";

  const [msgs, setMsgs] = useState<Msg[]>([
    { id: 1, from: "them", text: `Hi! Thanks for reaching out about ${prop?.title || "the property"}. How can I help?`, time: "10:24" },
  ]);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const send = () => {
    if (!draft.trim()) return;
    const t = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    setMsgs((m) => [...m, { id: Date.now(), from: "me", text: draft, time: t }]);
    setDraft("");
    setTimeout(() => {
      setMsgs((m) => [...m, { id: Date.now() + 1, from: "them", text: "Got it 👍 I'll get back to you in a few minutes.", time: t }]);
    }, 900);
  };

  const quick = ["Is it available?", "Can I inspect this weekend?", "Final price?"];

  return (
    <main className="flex flex-col h-screen">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center"><User className="w-5 h-5 text-primary" /></div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm truncate">{name}</div>
            <div className="text-[11px] text-success font-medium inline-flex items-center gap-1"><BadgeCheck className="w-3 h-3" /> {tag} · online</div>
          </div>
          <button className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center">
            <Phone className="w-4 h-4 text-primary" />
          </button>
        </div>
        {prop && (
          <div className="mx-4 mb-3 flex gap-2 rounded-xl bg-card border border-border p-2">
            <img src={prop.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate">{prop.title}</div>
              <div className="text-[10px] text-primary font-bold">{prop.price}</div>
            </div>
          </div>
        )}
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 pb-32">
        <div className="text-center">
          <span className="text-[10px] text-muted-foreground bg-card px-3 py-1 rounded-full border border-border">Today</span>
        </div>
        {msgs.map((m) => (
          <div key={m.id} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-sm ${
              m.from === "me"
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : "bg-card border border-border rounded-bl-sm"
            }`}>
              <div>{m.text}</div>
              <div className={`text-[9px] mt-1 ${m.from === "me" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{m.time}</div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur-xl border-t border-border safe-bottom">
        <div className="max-w-md mx-auto px-3 pb-20">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-2">
            {quick.map((q) => (
              <button key={q} onClick={() => setDraft(q)}
                className="shrink-0 text-[11px] px-3 py-1.5 rounded-full bg-card border border-border text-muted-foreground">
                {q}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 pb-2">
            <button className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center"><Paperclip className="w-4 h-4 text-muted-foreground" /></button>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Type a message…"
              className="flex-1 rounded-full bg-card border border-border px-4 py-2.5 text-sm"
            />
            <button onClick={send} className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ChatThread;
