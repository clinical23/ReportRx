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
import { createClient } from "@/lib/supabase/server";

type ActionResult = { ok: true } | { ok: false; error: string };

type ManagerAuth = { auth: Awaited<ReturnType<typeof requireProfileSession>> };

async function requireManager(): Promise<{ error: string } | ManagerAuth> {
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

async function verifyPcnInOrg(pcnId: string, organisationId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pcns")
    .select("id")
    .eq("id", pcnId)
    .eq("organisation_id", organisationId)
    .maybeSingle();
  return !!data;
}

async function verifyPracticeInOrg(practiceId: string, organisationId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("practices")
    .select("id")
    .eq("id", practiceId)
    .eq("organisation_id", organisationId)
    .maybeSingle();
  return !!data;
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
  const { auth } = check as ManagerAuth;
  if (!("profile" in auth)) return { ok: false, error: "Unauthorized" };
  if (!(await verifyPcnInOrg(id, (auth.profile as Record<string, unknown>).organisation_id as string))) {
    return { ok: false, error: "PCN not found" };
  }
  const { error } = await updatePcn(id, name);
  if (error) return { ok: false, error };
  revalidatePath("/settings");
  revalidatePath("/clinicians");
  return { ok: true };
}

export async function deletePcnAction(id: string): Promise<ActionResult> {
  const check = await requireManager();
  if ("error" in check) return { ok: false, error: check.error };
  const { auth } = check as ManagerAuth;
  if (!("profile" in auth)) return { ok: false, error: "Unauthorized" };
  if (!(await verifyPcnInOrg(id, (auth.profile as Record<string, unknown>).organisation_id as string))) {
    return { ok: false, error: "PCN not found" };
  }
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
  const { auth } = check as ManagerAuth;
  if (!("profile" in auth)) return { ok: false, error: "Unauthorized" };
  if (!(await verifyPracticeInOrg(id, (auth.profile as Record<string, unknown>).organisation_id as string))) {
    return { ok: false, error: "Practice not found" };
  }
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
  const { auth } = check as ManagerAuth;
  if (!("profile" in auth)) return { ok: false, error: "Unauthorized" };
  if (!(await verifyPracticeInOrg(practiceId, (auth.profile as Record<string, unknown>).organisation_id as string))) {
    return { ok: false, error: "Practice not found" };
  }
  const { error } = await assignPracticeToPcn(practiceId, pcnName);
  if (error) return { ok: false, error };
  revalidatePath("/settings");
  revalidatePath("/clinicians");
  return { ok: true };
}
