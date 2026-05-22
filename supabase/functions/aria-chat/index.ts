import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const systemFor = (role: string) => `You are Aria, the in-app AI concierge for Stayafrik — Africa's verified property platform (shortlets, homes, land, commercial, Nigeria-focused). Current user role: ${role}.

CORE PRODUCTS you can explain confidently:
• PropertyVerify™ — every listing's title is independently checked against the State Land Registry before going live.
• PropertyEscrow™ — funds held safely, released only after the buyer physically receives original title docs and confirms.
• Verified Agents — agents pass ID verification; commissions are transparent.
• Shortlets — verified short-stays paid via escrow.

TOOLS:
- Use search_listings whenever the user asks to find, browse, compare, or recommend properties (e.g. "2-bed in Lekki under 80k", "shortlets in Abuja"). Always call it instead of guessing listings or prices.
- Use get_listing_details when the user references a specific listing or asks for more info on one returned from search.

RULES:
- Never invent listings, prices, addresses, or agent names. If search returns nothing, say so and suggest broadening filters.
- Format responses in clean markdown: short paragraphs, **bold** for key terms, and bullet lists when comparing options.
- Use emojis sparingly (🏡 🔐 ✓ 📜).
- Mobile-first: keep replies tight unless the user asks for detail.
${role === "client"
  ? "- Help clients pick neighbourhoods, compare verified properties, understand fees/escrow, and feel safe booking."
  : "- Help agents draft compelling listing copy, prepare verification docs, and respond to client objections."}`;

const tools = [
  {
    type: "function",
    function: {
      name: "search_listings",
      description: "Search verified Stayafrik listings by city/area, type, price, bedrooms. Returns up to 6 results.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Free-text match on title/description/location" },
          city: { type: "string" },
          type: { type: "string", enum: ["Shortlet", "Home", "Land", "Commercial"] },
          max_price: { type: "number", description: "Max price per night (shortlets) or total price" },
          min_bedrooms: { type: "number" },
          verified_only: { type: "boolean", description: "Default true" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_listing_details",
      description: "Fetch full details of a single listing by id.",
      parameters: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
        additionalProperties: false,
      },
    },
  },
];

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function runTool(name: string, args: any) {
  if (name === "search_listings") {
    let q = sb.from("listings").select("id,title,type,city,location,price_per_night,bedrooms,bathrooms,verified,rating,reviews_count").eq("is_available", true).limit(6);
    if (args.verified_only !== false) q = q.eq("verified", true);
    if (args.city) q = q.ilike("city", `%${args.city}%`);
    if (args.type) q = q.eq("type", args.type);
    if (typeof args.max_price === "number") q = q.lte("price_per_night", args.max_price);
    if (typeof args.min_bedrooms === "number") q = q.gte("bedrooms", args.min_bedrooms);
    if (args.query) q = q.or(`title.ilike.%${args.query}%,description.ilike.%${args.query}%,location.ilike.%${args.query}%`);
    const { data, error } = await q;
    if (error) return { error: error.message };
    return { results: data ?? [] };
  }
  if (name === "get_listing_details") {
    const { data, error } = await sb.from("listings").select("*").eq("id", args.id).maybeSingle();
    if (error) return { error: error.message };
    return { listing: data };
  }
  return { error: `Unknown tool: ${name}` };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { messages, role } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const convo: any[] = [
      { role: "system", content: systemFor(role || "client") },
      ...messages,
    ];

    // Tool-calling loop (max 3 iterations).
    for (let i = 0; i < 3; i++) {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: convo,
          tools,
        }),
      });

      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!resp.ok) {
        const t = await resp.text();
        console.error("AI gateway error:", resp.status, t);
        return new Response(JSON.stringify({ error: "AI gateway error" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await resp.json();
      const msg = data.choices?.[0]?.message;
      if (!msg) break;

      const toolCalls = msg.tool_calls;
      if (toolCalls && toolCalls.length) {
        convo.push(msg);
        for (const tc of toolCalls) {
          let args: any = {};
          try { args = JSON.parse(tc.function?.arguments || "{}"); } catch {}
          const result = await runTool(tc.function?.name, args);
          convo.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          });
        }
        continue;
      }

      return new Response(JSON.stringify({ reply: msg.content ?? "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ reply: "I couldn't reach a final answer — please try rephrasing." }), {
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
