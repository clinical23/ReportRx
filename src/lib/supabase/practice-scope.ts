import { createClient } from "@/lib/supabase/server";
import type { AuthSession } from "@/lib/supabase/auth-profile";
import { isAppRole } from "@/lib/supabase/auth-profile";

/**
 * Practice UUIDs the current user may see activity/reporting for.
 * practice_manager / clinician: home practice only.
 * pcn_manager: all practices sharing the same practices.pcn_name as their home practice.
 */
export async function getPracticeScopeIdsForSession(
  session: AuthSession | null,
): Promise<string[]> {
  if (!session?.profile || !isAppRole(session.profile.role)) {
    return [];
  }

  const { role, practice_id } = session.profile;
  if (!practice_id) {
    return [];
  }

  if (role === "practice_manager" || role === "clinician") {
    return [practice_id];
  }

  if (role === "pcn_manager") {
    const supabase = await createClient();
    const { data: home } = await supabase
      .from("practices")
      .select("pcn_name")
      .eq("id", practice_id)
      .maybeSingle();

    if (!home?.pcn_name) {
      return [practice_id];
    }

    const { data: inPcn } = await supabase
      .from("practices")
      .select("id")
      .eq("pcn_name", home.pcn_name);

    return (inPcn ?? []).map((p) => p.id);
  }

  return [];
}
