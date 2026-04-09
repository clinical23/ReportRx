import type { User } from "@supabase/supabase-js";

import type { Database } from "./database.types";
import { createClient } from "./server";

export type AppRole =
  | "clinician"
  | "practice_manager"
  | "pcn_manager"
  | "manager"
  | "admin"
  | "superadmin";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

/** Authenticated user profile row (includes optional link to clinicians.id). */
export type AuthProfile = ProfileRow;

export type AuthSession = {
  user: User;
  profile: AuthProfile | null;
};

export async function getAuthProfile(): Promise<AuthSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { user, profile: profile ?? null };
}

export function isAppRole(value: string | undefined): value is AppRole {
  return (
    value === "clinician" ||
    value === "practice_manager" ||
    value === "pcn_manager" ||
    value === "manager" ||
    value === "admin" ||
    value === "superadmin"
  );
}

export { formatRoleLabel } from "@/lib/role-format";
