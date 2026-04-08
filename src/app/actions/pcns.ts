"use server";

import { revalidatePath } from "next/cache";

import { requireProfileSession } from "@/lib/supabase/action-session";
import { isAppRole } from "@/lib/supabase/auth-profile";
import {
  assignPracticeToPcn,
  createPcn,
  deletePcn,
  updatePcn,
  updatePracticeName,
} from "@/lib/supabase/data";

type ActionResult = { ok: true } | { ok: false; error: string };

async function requireManager(): Promise<{ error: string } | { auth: Awaited<ReturnType<typeof requireProfileSession>> }> {
  const auth = await requireProfileSession();
  if ("error" in auth) return { error: auth.error };
  if (
    !isAppRole(auth.profile.role) ||
    (auth.profile.role !== "practice_manager" &&
      auth.profile.role !== "pcn_manager")
  ) {
    return { error: "Unauthorized" };
  }
  return { auth };
}

export async function createPcnAction(name: string): Promise<ActionResult> {
  const check = await requireManager();
  if ("error" in check) return { ok: false, error: check.error };
  const { error } = await createPcn(name);
  if (error) return { ok: false, error };
  revalidatePath("/settings");
  revalidatePath("/clinicians");
  return { ok: true };
}

export async function updatePcnAction(
  id: string,
  name: string,
): Promise<ActionResult> {
  const check = await requireManager();
  if ("error" in check) return { ok: false, error: check.error };
  const { error } = await updatePcn(id, name);
  if (error) return { ok: false, error };
  revalidatePath("/settings");
  revalidatePath("/clinicians");
  return { ok: true };
}

export async function deletePcnAction(id: string): Promise<ActionResult> {
  const check = await requireManager();
  if ("error" in check) return { ok: false, error: check.error };
  const { error } = await deletePcn(id);
  if (error) return { ok: false, error };
  revalidatePath("/settings");
  revalidatePath("/clinicians");
  return { ok: true };
}

export async function updatePracticeNameAction(
  id: string,
  name: string,
): Promise<ActionResult> {
  const check = await requireManager();
  if ("error" in check) return { ok: false, error: check.error };
  const { error } = await updatePracticeName(id, name);
  if (error) return { ok: false, error };
  revalidatePath("/settings");
  revalidatePath("/clinicians");
  return { ok: true };
}

export async function assignPracticeToPcnAction(
  practiceId: string,
  pcnName: string | null,
): Promise<ActionResult> {
  const check = await requireManager();
  if ("error" in check) return { ok: false, error: check.error };
  const { error } = await assignPracticeToPcn(practiceId, pcnName);
  if (error) return { ok: false, error };
  revalidatePath("/settings");
  revalidatePath("/clinicians");
  return { ok: true };
}
