import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { X, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

export const AIAssistant = () => {
  const { role } = useRole();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        role === "client"
          ? "Hi 👋 I'm Aria, your Stayafrik assistant. Ask me to find a verified shortlet, explain how escrow works, or compare neighbourhoods."
          : "Hi 👋 I'm Aria, your agent assistant. I can help you draft listing descriptions, explain verification steps, and answer client questions.",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("aria-chat", {
        body: { messages: next, role },
      });
      if (error) throw error;
      if (data?.error) {
        if (data.error.includes("Rate")) toast.error("Too many requests. Slow down a bit 🙏");
        else if (data.error.includes("Payment")) toast.error("AI credits exhausted. Add credits in workspace.");
        else toast.error(data.error);
        setLoading(false);
        return;
      }
      setMessages((m) => [...m, { role: "assistant", content: data.reply || "..." }]);
    } catch (e) {
      console.error(e);
      toast.error("Aria is offline right now");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-glow flex items-center justify-center font-bold active:scale-95 transition-transform"
        aria-label="Open Aria AI assistant"
      >
        <Sparkles className="w-6 h-6" />
      </button>

      {/* Sheet */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background animate-fade-in">
          <header className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-sm">Aria</h2>
                <p className="text-[11px] text-muted-foreground">Your Stayafrik AI · {role}</p>
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
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-secondary text-foreground rounded-bl-sm"
                  }`}
                >
                  {m.content}
                </div>
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
          </div>

          <div className="border-t border-border p-3 safe-bottom">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder={role === "client" ? "Ask about a shortlet…" : "Ask about a listing…"}
                className="flex-1 bg-secondary border border-border rounded-full px-4 py-3 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={send}
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
