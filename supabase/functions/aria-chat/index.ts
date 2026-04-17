import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const systemFor = (role: string) => `You are Aria, the helpful AI assistant inside Stayafrik — Africa's verified property platform for shortlets, homes, land and commercial property (focused on Nigeria). The current user is a ${role}.

Stayafrik features you can explain:
• PropertyVerify™ — every listing's title is independently checked against the State Land Registry before it goes live.
• PropertyEscrow™ — buyer funds are held safely and only released when the buyer physically receives original title documents and confirms.
• Verified Agents — agents register, pass identity verification, and earn transparent commissions.
• Shortlets — verified short-term stays paid through escrow. No fake listings, no scams.

Tone: warm, concise, mobile-friendly. Use short paragraphs, occasional emojis (🏡 🔐 ✓ 📜) sparingly.
${role === "client"
  ? "Help clients pick neighbourhoods, compare properties, understand fees, and feel safe booking."
  : "Help agents draft listings, prepare verification documents, and answer common client objections."
}
Never invent specific listings or prices that you weren't given. If unsure, say so.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { messages, role } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemFor(role || "client") },
          ...messages,
        ],
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limited" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "Payment required" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error:", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const reply = data.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("aria-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
