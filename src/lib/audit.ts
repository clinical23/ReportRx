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

export type AuditResourceType =
  | "dashboard"
  | "reporting"
  | "activity_log"
  | "clinician"
  | "settings"
  | "admin"
  | "auth"
  | "practice_assignment"
  | "bulk_invite"
  | "dsar"
  | "additional_working_day";

/**
 * Browser-only audit insert (uses anon client + session). Fire-and-forget from UI: `void logAudit(...)`.
 * Logout flows may `await logAudit(...)` so the row is written before the session ends.
 */
export async function logAudit(
  action: AuditAction,
  resourceType: AuditResourceType,
  resourceId?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("organisation_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile?.organisation_id) return;

    const { error } = await supabase.from("audit_logs").insert({
      user_id: user.id,
      organisation_id: profile.organisation_id,
      action,
      resource_type: resourceType,
      resource_id: resourceId ?? null,
      metadata: (metadata === undefined ? null : metadata) as Json | null,
      user_agent:
        typeof navigator !== "undefined" ? navigator.userAgent : null,
    });

    if (error) console.error("[audit]", error);
  } catch (err) {
    console.error("[audit]", err);
  }
}

async function insertAuditWithServerClient(
  supabase: SupabaseClient<Database>,
  action: AuditAction,
  resourceType: AuditResourceType,
  resourceId?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("organisation_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile?.organisation_id) return;

  const { error } = await supabase.from("audit_logs").insert({
    user_id: user.id,
    organisation_id: profile.organisation_id,
    action,
    resource_type: resourceType,
    resource_id: resourceId ?? null,
    metadata: (metadata === undefined ? null : metadata) as Json | null,
    user_agent: null,
  });

  if (error) console.error("[audit]", error);
}

/**
 * Server Actions and Route Handlers: session must be the acting user. Non-blocking.
 */
export function logAuditWithServerSupabase(
  supabase: SupabaseClient<Database>,
  action: AuditAction,
  resourceType: AuditResourceType,
  resourceId?: string,
  metadata?: Record<string, unknown>,
): void {
  void (async () => {
    try {
      await insertAuditWithServerClient(
        supabase,
        action,
        resourceType,
        resourceId,
        metadata,
      );
    } catch (err) {
      console.error("[audit]", err);
    }
  })();
}

/** Await before ending the session (e.g. sign-out). */
export async function awaitLogAuditWithServerSupabase(
  supabase: SupabaseClient<Database>,
  action: AuditAction,
  resourceType: AuditResourceType,
  resourceId?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await insertAuditWithServerClient(
      supabase,
      action,
      resourceType,
      resourceId,
      metadata,
    );
  } catch (err) {
    console.error("[audit]", err);
  }
}
