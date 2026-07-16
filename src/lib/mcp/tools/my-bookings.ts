import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "my_bookings",
  title: "My bookings",
  description: "List the signed-in user's bookings, most recent first.",
  inputSchema: {
    status: z.string().optional().describe("Optional status filter (e.g. pending, confirmed, completed, cancelled)."),
    limit: z.number().int().min(1).max(50).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (args, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = supabaseForUser(ctx)
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(args.limit ?? 20);
    if (args.status) q = q.eq("status", args.status);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }], structuredContent: { bookings: data ?? [] } };
  },
});
