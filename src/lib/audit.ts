import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/lib/supabase/database.types";

export type AuditAction =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "export"
  | "login"
  | "logout"
  | "invite"
  | "deactivate";

export type AuditResource =
  | "dashboard"
  | "reporting"
  | "activity_log"
  | "clinician"
  | "settings"
  | "admin"
  | "auth"
  | "practice_assignment"
  | "bulk_invite"
  | "dsar";

export type AuditSupabaseClient = SupabaseClient<Database>;

export interface AuditLogParams {
  supabase: AuditSupabaseClient;
  action: AuditAction;
  resourceType: AuditResource;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Writes an audit row without blocking the caller (insert is not awaited).
 * Never throws to the caller.
 */
export function logAudit({
  supabase,
  action,
  resourceType,
  resourceId,
  metadata,
  ipAddress,
  userAgent,
}: AuditLogParams): void {
  void (async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("organisation_id")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.organisation_id) return;

      const row: Database["public"]["Tables"]["audit_logs"]["Insert"] = {
        user_id: user.id,
        organisation_id: profile.organisation_id,
        action,
        resource_type: resourceType,
        resource_id: resourceId ?? null,
        metadata: (metadata != null ? (metadata as Json) : null),
        ip_address: ipAddress ?? null,
        user_agent: userAgent ?? null,
      };

      void supabase.from("audit_logs").insert(row).then(({ error }) => {
        if (error) console.warn("[audit]", error.message);
      });
    } catch {
      /* ignore */
    }
  })();
}
