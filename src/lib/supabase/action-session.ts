import type { User } from "@supabase/supabase-js";

import {
  getAuthProfile,
  type ProfileRow,
} from "@/lib/supabase/auth-profile";

export type ProfileSession =
  | { user: User; profile: ProfileRow }
  | { error: string };

export async function requireProfileSession(): Promise<ProfileSession> {
  const session = await getAuthProfile();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }
  if (!session.profile) {
    return { error: "Unauthorized" };
  }
  return { user: session.user, profile: session.profile };
}
