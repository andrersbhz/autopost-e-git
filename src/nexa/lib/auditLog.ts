import { supabase } from "@/integrations/supabase/client";

export async function logAudit(params: {
  organizationId: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const row: Record<string, unknown> = {
    user_id: user.id,
    action: params.action,
    metadata: params.metadata ?? {},
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
  };
  if (params.organizationId) row.organization_id = params.organizationId;
  if (params.entityType) row.entity_type = params.entityType;
  if (params.entityId) row.entity_id = params.entityId;
  await supabase.from("nexa_audit_logs").insert(row as never);
}
