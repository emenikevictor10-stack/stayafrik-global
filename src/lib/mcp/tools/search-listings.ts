import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_listings",
  title: "Search listings",
  description: "Search verified StayGlobal shortlet listings by city, price, or bedrooms. Returns up to 20 listings visible to the signed-in user.",
  inputSchema: {
    city: z.string().optional().describe("Filter by city (case-insensitive contains)."),
    query: z.string().optional().describe("Free-text match against title, description, or location."),
    max_price_per_night: z.number().positive().optional(),
    min_bedrooms: z.number().int().nonnegative().optional(),
    verified_only: z.boolean().optional().describe("Default true."),
    limit: z.number().int().min(1).max(50).optional().describe("Default 20."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (args, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const sb = supabaseForUser(ctx);
    let q = sb.from("listings").select("id,title,type,city,location,price_per_night,bedrooms,bathrooms,verified,rating,reviews_count").eq("is_available", true).limit(args.limit ?? 20);
    if (args.verified_only !== false) q = q.eq("verified", true);
    if (args.city) q = q.ilike("city", `%${args.city}%`);
    if (typeof args.max_price_per_night === "number") q = q.lte("price_per_night", args.max_price_per_night);
    if (typeof args.min_bedrooms === "number") q = q.gte("bedrooms", args.min_bedrooms);
    if (args.query) q = q.or(`title.ilike.%${args.query}%,description.ilike.%${args.query}%,location.ilike.%${args.query}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { results: data ?? [] },
    };
  },
});
