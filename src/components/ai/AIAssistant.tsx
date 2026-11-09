import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { X, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

type Card = { id: string; title: string; area: string; price: number; image: string };
type Msg = { role: "user" | "assistant"; content: string; cards?: Card[] };

const deviceId = () => {
  try {
    let d = localStorage.getItem("aria_device");
    if (!d) { d = crypto.randomUUID(); localStorage.setItem("aria_device", d); }
    return d;
  } catch { return ""; }
};

export const AIAssistant = () => {
  const { pathname } = useLocation();
  const raised = /^\/(stays|property)\/[^/]+/.test(pathname);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const greeting: Msg = {
    role: "assistant",
    content:
      "Hi 👋 I'm **Aria**, your StayGlobal assistant. Tell me where and when you'd like to stay, your budget, or ask about payments and refunds.",
  };
  const [messages, setMessages] = useState<Msg[]>([greeting]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const quickPrompts = ["2-bed in Lekki under ₦100k a night", "What if I need to cancel?", "Stays in Wuse 2, Abuja", "When is my next trip?"];

  const sendText = async (text: string) => {
    if (!text.trim() || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text.trim() }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("aria-chat", {
        body: { messages: next.map(({ role: r, content }) => ({ role: r, content })), device: deviceId() },
      });
      if (error) throw error;
      if (data?.error) {
        if (data.error === "limit") { setMessages((m) => [...m, { role: "assistant", content: data.reply }]); setLoading(false); return; }
        if (data.error.includes("Rate")) toast.error("Too many requests. Slow down a bit 🙏");
        else if (data.error.includes("Payment")) toast.error("AI credits exhausted. Add credits in workspace.");
        else toast.error(data.error);
        setLoading(false);
        return;
      }
      setMessages((m) => [...m, { role: "assistant", content: data.reply || "…", cards: data.cards || [] }]);
    } catch (e) {
      console.error(e);
      toast.error("Aria is offline right now");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* FAB - smaller */}
      <button
        onClick={() => setOpen(true)}
        className={cn("fixed right-4 z-40", raised ? "bottom-40 lg:bottom-20" : "bottom-20", " w-11 h-11 rounded-full bg-primary text-primary-foreground shadow-glow flex items-center justify-center active:scale-95 transition-transform")}
        aria-label="Open Aria AI assistant"
      >
        <Sparkles className="w-[18px] h-[18px]" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background animate-fade-in">
          <header className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-sm">Aria</h2>
                <p className="text-xs text-muted-foreground">StayGlobal assistant</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className="space-y-2">
              <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm whitespace-pre-wrap"
                      : "bg-secondary text-foreground rounded-bl-sm prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-headings:my-2"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  ) : (
                    m.content
                  )}
                </div>
              </div>
              {!!m.cards?.length && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {m.cards.map((c) => (
                    <Link key={c.id} to={`/property/${c.id}`} onClick={() => setOpen(false)} className="shrink-0 w-44 rounded-xl border border-border bg-background overflow-hidden hover:border-primary">
                      {c.image ? <img src={c.image} alt="" loading="lazy" className="w-full h-24 object-cover" /> : <div className="w-full h-24 bg-secondary" />}
                      <div className="p-2">
                        <p className="text-xs font-semibold line-clamp-1">{c.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{c.area}</p>
                        <p className="text-xs font-semibold mt-1">₦{Math.round(c.price).toLocaleString()} <span className="font-normal text-muted-foreground">/ night</span></p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-secondary px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.3s]" />
                </div>
              </div>
            )}

            {messages.length === 1 && !loading && (
              <div className="flex flex-wrap gap-2 pt-2">
                {quickPrompts.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendText(q)}
                    className="text-xs px-3 py-2 rounded-full bg-secondary text-foreground border border-border hover:border-primary transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-border p-3 safe-bottom">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendText(input)}
                placeholder="Ask about a stay…"
                className="flex-1 bg-secondary border border-border rounded-full px-4 py-3 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={() => sendText(input)}
                disabled={loading || !input.trim()}
                className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 active:scale-95"
                aria-label="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
