import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "my_notifications",
  title: "My notifications",
  description: "Fetch the signed-in user's most recent in-app notifications.",
  inputSchema: {
    unread_only: z.boolean().optional(),
    limit: z.number().int().min(1).max(100).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (args, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = supabaseForUser(ctx)
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(args.limit ?? 20);
    if (args.unread_only) q = q.is("read_at", null);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }], structuredContent: { notifications: data ?? [] } };
  },
});
