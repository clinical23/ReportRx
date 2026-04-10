import { createAdminClient } from "@/lib/supabase/admin";

/** Most recent self-initiated DSAR export time for this user (service role; server-only). */
export async function getLastDsarSelfExportAt(
  userId: string,
): Promise<string | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("audit_logs")
    .select("created_at")
    .eq("user_id", userId)
    .eq("action", "export")
    .eq("resource_type", "dsar")
    .is("resource_id", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("[dsar] last export lookup", error.message);
    return null;
  }
  return data?.created_at ?? null;
}
