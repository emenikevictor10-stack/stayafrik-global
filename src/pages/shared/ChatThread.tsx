import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { ChevronLeft, Send, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Msg = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  listing_id?: string | null;
};

type Profile = { user_id: string; full_name: string | null; avatar_url: string | null };

const isUuid = (s: string | undefined) =>
  !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

type ListingLite = { id: string; title: string; images: string[] | null; location: string | null; price_per_night: number | null };

const ChatThread = () => {
  const { agentId } = useParams();
  const [params] = useSearchParams();
  const listingId = params.get("listing");
  const navigate = useNavigate();
  const { user } = useAuth();
  const [other, setOther] = useState<Profile | null>(null);
  const [listing, setListing] = useState<ListingLite | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const otherId = agentId;


  useEffect(() => {
    if (!user || !isUuid(otherId)) return;
    (async () => {
      const { data: profiles } = await supabase.rpc("get_public_profiles", { _user_ids: [otherId!] });
      const profile = (profiles as Profile[] | null)?.[0] ?? null;
      setOther(profile);

      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true });
      setMsgs((data as Msg[]) || []);

      // Fetch the listing this thread is about — prefer ?listing= param, fall back to newest message with listing_id
      const lid =
        listingId ||
        ((data as Msg[] | null) || []).slice().reverse().find((m) => m.listing_id)?.listing_id ||
        null;
      if (lid) {
        const { data: l } = await supabase
          .from("listings")
          .select("id,title,images,location,price_per_night")
          .eq("id", lid)
          .maybeSingle();
        setListing((l as ListingLite | null) || null);
      } else {
        setListing(null);
      }


      // Mark related notifications as read
      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("type", "message")
        .eq("link", `/messages/${otherId}`)
        .is("read_at", null);
    })();

    const ch = supabase
      .channel(`thread:${user.id}:${otherId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as Msg;
          const mine = (m.sender_id === user.id && m.receiver_id === otherId) ||
                       (m.sender_id === otherId && m.receiver_id === user.id);
          if (mine) setMsgs((prev) => [...prev, m]);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, otherId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async () => {
    if (!draft.trim() || !user || !isUuid(otherId)) return;
    setSending(true);
    const content = draft.trim();
    setDraft("");
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: otherId,
      content,
      listing_id: listingId || null,
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      setDraft(content);
    }
  };

  const name = other?.full_name || "User";
  const quick = ["Is it available?", "Can I check in this weekend?", "Best price?"];

  if (!isUuid(otherId)) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <p className="text-sm text-muted-foreground">Invalid conversation.</p>
        <button onClick={() => navigate("/messages")} className="mt-4 text-primary text-sm font-bold">Back to inbox</button>
      </main>
    );
  }

  return (
    <main className="flex flex-col h-screen">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center overflow-hidden">
            {other?.avatar_url ? <img src={other.avatar_url} alt="" className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-primary" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm truncate">{name}</div>
          </div>
        </div>
      </header>

      {listing && (
        <a
          href={`/property/${listing.id}`}
          className="mx-3 mt-3 flex items-center gap-3 rounded-2xl bg-card border border-border p-2.5"
        >
          <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
            {listing.images?.[0] ? (
              <img src={listing.images[0]} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl">🏠</div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Chatting about</div>
            <div className="text-xs font-bold truncate">{listing.title}</div>
            {listing.location && (
              <div className="text-[10px] text-muted-foreground truncate">📍 {listing.location}</div>
            )}
          </div>
          {listing.price_per_night != null && (
            <div className="text-primary text-xs font-extrabold shrink-0">
              ₦{listing.price_per_night.toLocaleString()}
            </div>
          )}
        </a>
      )}


      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 pb-40">
        {msgs.length === 0 && (
          <p className="text-center text-xs text-muted-foreground pt-10">No messages yet. Say hello!</p>
        )}
        {msgs.map((m) => (
          <div key={m.id} className={`flex ${m.sender_id === user?.id ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-sm ${
              m.sender_id === user?.id
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : "bg-card border border-border rounded-bl-sm"
            }`}>
              <div className="whitespace-pre-wrap">{m.content}</div>
              <div className={`text-[9px] mt-1 ${m.sender_id === user?.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {new Date(m.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur-xl border-t border-border safe-bottom">
        <div className="max-w-md mx-auto px-3 pb-3">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-2">
            {quick.map((q) => (
              <button key={q} onClick={() => setDraft(q)}
                className="shrink-0 text-[11px] px-3 py-1.5 rounded-full bg-card border border-border text-muted-foreground">
                {q}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 pb-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Type a message…"
              className="flex-1 rounded-full bg-card border border-border px-4 py-2.5 text-sm"
            />
            <button onClick={send} disabled={sending || !draft.trim()} className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ChatThread;
