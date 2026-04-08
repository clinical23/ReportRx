"use server";

import { revalidatePath } from "next/cache";

import { requireProfileSession } from "@/lib/supabase/action-session";
import { isAppRole } from "@/lib/supabase/auth-profile";
import { createClinician, updateClinician } from "@/lib/supabase/data";

export type ClinicianMutationResult =
  | { ok: true }
  | { ok: false; error: string };

function parsePracticeIds(formData: FormData): string[] {
  const all = formData.getAll("practice_ids");
  const ids = all
    .map((v) => String(v).trim())
    .filter((v) => v.length > 0);
  return [...new Set(ids)];
}

function parsePcnIds(formData: FormData): string[] {
  const all = formData.getAll("pcn_ids");
  const ids = all
    .map((v) => String(v).trim())
    .filter((v) => v.length > 0);
  return [...new Set(ids)];
}

function practicesAllowedForManager(
  practiceIds: string[],
  managerPracticeId: string,
): boolean {
  return practiceIds.every((id) => id === managerPracticeId);
}

export async function addClinicianAction(
  formData: FormData,
): Promise<ClinicianMutationResult> {
  const auth = await requireProfileSession();
  if ("error" in auth) {
    return { ok: false, error: auth.error };
  }
  if (
    !isAppRole(auth.profile.role) ||
    auth.profile.role !== "practice_manager" ||
    !auth.profile.practice_id
  ) {
    return { ok: false, error: "Unauthorized" };
  }

  const managerPracticeId = auth.profile.practice_id;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { ok: false, error: "Name is required" };
  }

  const role = String(formData.get("role") ?? "Clinician").trim() || "Clinician";
  const practice_ids = parsePracticeIds(formData);
  const pcn_ids = parsePcnIds(formData);

  if (practice_ids.length === 0) {
    return { ok: false, error: "Link at least one practice." };
  }
  if (!practicesAllowedForManager(practice_ids, managerPracticeId)) {
    return { ok: false, error: "Unauthorized" };
  }

  const { error } = await createClinician({
    name,
    role,
    practice_ids,
    pcn_ids,
  });
  if (error) {
    return { ok: false, error };
  }

  revalidatePath("/", "page");
  revalidatePath("/clinicians", "page");
  revalidatePath("/activity", "page");
  revalidatePath("/reporting", "page");
  return { ok: true };
}

export async function updateClinicianAction(
  formData: FormData,
): Promise<ClinicianMutationResult> {
  const auth = await requireProfileSession();
  if ("error" in auth) {
    return { ok: false, error: auth.error };
  }
  if (
    !isAppRole(auth.profile.role) ||
    auth.profile.role !== "practice_manager" ||
    !auth.profile.practice_id
  ) {
    return { ok: false, error: "Unauthorized" };
  }

  const managerPracticeId = auth.profile.practice_id;

  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    return { ok: false, error: "Missing clinician id" };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { ok: false, error: "Name is required" };
  }

  const role = String(formData.get("role") ?? "").trim() || "Clinician";
  const practice_ids = parsePracticeIds(formData);
  const pcn_ids = parsePcnIds(formData);

  if (practice_ids.length === 0) {
    return { ok: false, error: "Link at least one practice." };
  }
  if (!practicesAllowedForManager(practice_ids, managerPracticeId)) {
    return { ok: false, error: "Unauthorized" };
  }

  const { error } = await updateClinician({
    id,
    name,
    role,
    practice_ids,
    pcn_ids,
  });
  if (error) {
    return { ok: false, error };
  }

  revalidatePath("/", "page");
  revalidatePath("/clinicians", "page");
  revalidatePath("/activity", "page");
  revalidatePath("/reporting", "page");
  return { ok: true };
}
