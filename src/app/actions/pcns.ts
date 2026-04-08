"use server";

import { revalidatePath } from "next/cache";

import { requireProfileSession } from "@/lib/supabase/action-session";
import { isAppRole } from "@/lib/supabase/auth-profile";
import { createPcn, deletePcn } from "@/lib/supabase/data";

export async function createPcnAction(
  name: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await requireProfileSession();
  if ("error" in auth) {
    return { ok: false, error: auth.error };
  }
  if (
    !isAppRole(auth.profile.role) ||
    (auth.profile.role !== "practice_manager" &&
      auth.profile.role !== "pcn_manager")
  ) {
    return { ok: false, error: "Unauthorized" };
  }

  const { error } = await createPcn(name);
  if (error) {
    return { ok: false, error };
  }
  revalidatePath("/settings");
  revalidatePath("/clinicians");
  return { ok: true };
}

export async function deletePcnAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await requireProfileSession();
  if ("error" in auth) {
    return { ok: false, error: auth.error };
  }
  if (
    !isAppRole(auth.profile.role) ||
    (auth.profile.role !== "practice_manager" &&
      auth.profile.role !== "pcn_manager")
  ) {
    return { ok: false, error: "Unauthorized" };
  }

  const { error } = await deletePcn(id);
  if (error) {
    return { ok: false, error };
  }
  revalidatePath("/settings");
  revalidatePath("/clinicians");
  return { ok: true };
}
