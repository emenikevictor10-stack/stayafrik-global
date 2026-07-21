import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "Missing auth" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
    const callerId = userData.user.id;

    const admin = createClient(url, service);
    const { data: isAdminRow } = await admin
      .from("user_roles").select("role").eq("user_id", callerId).eq("role", "admin").maybeSingle();
    if (!isAdminRow) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const { user_id, role, action } = body as { user_id?: string; role?: string; action?: "grant" | "revoke" };
    if (!user_id || !role || !action) return json({ error: "Missing fields" }, 400);
    if (!["admin", "agent", "client"].includes(role)) return json({ error: "Invalid role" }, 400);

    if (action === "grant") {
      const { error } = await admin.from("user_roles").upsert({ user_id, role }, { onConflict: "user_id,role", ignoreDuplicates: true });
      if (error) return json({ error: error.message }, 400);
    } else {
      if (role === "admin" && user_id === callerId) return json({ error: "Cannot revoke your own admin role" }, 400);
      const { error } = await admin.from("user_roles").delete().eq("user_id", user_id).eq("role", role);
      if (error) return json({ error: error.message }, 400);
    }

    await admin.from("admin_audit_log").insert({
      actor_id: callerId,
      action: `${action}_${role}`,
      entity_type: "user",
      entity_id: user_id,
    });

    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
