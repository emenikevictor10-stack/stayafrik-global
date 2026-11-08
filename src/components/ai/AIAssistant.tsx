import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
  const greeting: Msg = {
    role: "assistant",
    content:
      role === "client"
        ? "Hi 👋 I'm **Aria**, your Stay assistant. Ask me to find a verified shortlet, compare neighbourhoods, or explain how escrow works."
        : "Hi 👋 I'm **Aria**, your agent copilot. I can draft listing descriptions, summarise verification steps, and handle client objections.",
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

  const quickPrompts = role === "client"
    ? ["Find a 2-bed shortlet in Lekki under ₦80k", "How does PropertyEscrow™ work?", "Best verified areas in Abuja"]
    : ["Draft a listing for a 3-bed in Ikeja", "What docs do I need for PropertyVerify™?", "Handle: 'Is this listing real?'"];

  const sendText = async (text: string) => {
    if (!text.trim() || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text.trim() }];
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
      setMessages((m) => [...m, { role: "assistant", content: data.reply || "…" }]);
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
        className="fixed bottom-20 right-4 z-40 w-11 h-11 rounded-full bg-primary text-primary-foreground shadow-glow flex items-center justify-center active:scale-95 transition-transform"
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
                <p className="text-xs text-muted-foreground">Your Stay AI · {role}</p>
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
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
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
                placeholder={role === "client" ? "Ask about a shortlet…" : "Ask about a listing…"}
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
