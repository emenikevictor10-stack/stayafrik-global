import { supabase } from "@/integrations/supabase/client";

export const logAdminAction = async (params: {
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("admin_audit_log" as any).insert({
    actor_id: user.id,
    action: params.action,
    entity_type: params.entityType ?? null,
    entity_id: params.entityId ?? null,
    metadata: params.metadata ?? {},
  });
};
