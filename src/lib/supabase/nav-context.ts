import { formatRoleLabel } from "@/lib/role-format";

import { createClient } from "./server";
import { getAuthProfile } from "./auth-profile";

export type NavContext = {
  practiceName: string;
  userDisplayName: string;
  userEmail: string;
  sidebarLine: string;
  initials: string;
  roleLabel: string;
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export async function getNavContext(): Promise<NavContext | null> {
  const session = await getAuthProfile();
  if (!session?.user) return null;

  const { user, profile } = session;
  const displayName = profile?.full_name?.trim() || user.email || "User";
  const email = user.email ?? "";

  let practiceName = "Practice";
  if (profile?.practice_id) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("practices")
      .select("name")
      .eq("id", profile.practice_id)
      .maybeSingle();
    if (data?.name) practiceName = data.name;
  }

  const roleLabel = profile?.role
    ? formatRoleLabel(profile.role)
    : "User";
  const sidebarLine = profile
    ? `${displayName} — ${roleLabel}`
    : displayName;

  return {
    practiceName,
    userDisplayName: displayName,
    userEmail: email,
    sidebarLine,
    initials: initialsFromName(displayName),
    roleLabel,
  };
}
