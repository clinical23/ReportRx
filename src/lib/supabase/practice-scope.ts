import { createClient } from "@/lib/supabase/server";
import type { AuthSession } from "@/lib/supabase/auth-profile";
import { isAppRole } from "@/lib/supabase/auth-profile";

type ProfileWithOrg = NonNullable<AuthSession["profile"]> & {
  organisation_id?: string | null;
};

/**
 * Practice UUIDs the current user may see activity/reporting for.
 * practice_manager / clinician: home practice only.
 * pcn_manager / manager: all practices sharing the same practices.pcn_name as their home practice.
 * admin / superadmin: all practices in their organisation (or RLS-visible practices).
 */
export async function getPracticeScopeIdsForSession(
  session: AuthSession | null,
): Promise<string[]> {
  if (!session?.profile || !isAppRole(session.profile.role)) {
    return [];
  }

  const profile = session.profile as ProfileWithOrg;
  const { role, practice_id } = profile;
  const orgId = profile.organisation_id ?? null;

  const supabase = await createClient();

  if (role === "admin" || role === "superadmin") {
    if (orgId) {
      const { data, error } = await supabase
        .from("practices")
        .select("id")
        .eq("organisation_id", orgId);
      if (error) {
        console.error(
          "[getPracticeScopeIdsForSession] org practices:",
          error.message,
        );
        return practice_id ? [practice_id] : [];
      }
      const ids = (data ?? []).map((p) => p.id).filter(Boolean);
      if (ids.length > 0) {
        return ids;
      }
      return practice_id ? [practice_id] : [];
    }

    const { data, error } = await supabase.from("practices").select("id");
    if (error) {
      console.error(
        "[getPracticeScopeIdsForSession] all practices:",
        error.message,
      );
      return practice_id ? [practice_id] : [];
    }
    return (data ?? []).map((p) => p.id);
  }

  if (!practice_id) {
    return [];
  }

  if (role === "practice_manager" || role === "clinician") {
    return [practice_id];
  }

  if (role === "pcn_manager" || role === "manager") {
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
