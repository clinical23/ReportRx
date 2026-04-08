"use server";

import { revalidatePath } from "next/cache";

import { requireProfileSession } from "@/lib/supabase/action-session";
import {
  createClinician,
  deleteClinician,
  updateClinician,
} from "@/lib/supabase/data";
import { userHasPermission } from "@/lib/supabase/permissions";

export type ClinicianMutationResult =
  | { ok: true }
  | { ok: false; error: string };

export type DeleteClinicianResult =
  | { success: true }
  | { error: string };

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

function parseClinicianTypeId(formData: FormData): string | null {
  const raw = String(formData.get("clinician_type_id") ?? "").trim();
  return raw.length > 0 ? raw : null;
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

  const allowed = await userHasPermission(auth.profile.id, "clinicians.add");
  if (!allowed) {
    return { ok: false, error: "Unauthorized" };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { ok: false, error: "Name is required" };
  }

  const role = "Clinician";
  const clinician_type_id = parseClinicianTypeId(formData);
  if (!clinician_type_id) {
    return { ok: false, error: "Clinician type is required." };
  }
  const practice_ids = parsePracticeIds(formData);
  const pcn_ids = parsePcnIds(formData);

  if (practice_ids.length === 0) {
    return { ok: false, error: "Select at least one practice." };
  }
  if (pcn_ids.length === 0) {
    return { ok: false, error: "Select at least one PCN." };
  }

  if (auth.profile.practice_id) {
    if (!practicesAllowedForManager(practice_ids, auth.profile.practice_id)) {
      return { ok: false, error: "Unauthorized" };
    }
  }

  const { error } = await createClinician({
    name,
    role,
    clinician_type_id,
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

  const allowed = await userHasPermission(auth.profile.id, "clinicians.edit");
  if (!allowed) {
    return { ok: false, error: "Unauthorized" };
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    return { ok: false, error: "Missing clinician id" };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { ok: false, error: "Name is required" };
  }

  const role = "Clinician";
  const clinician_type_id = parseClinicianTypeId(formData);
  if (!clinician_type_id) {
    return { ok: false, error: "Clinician type is required." };
  }
  const practice_ids = parsePracticeIds(formData);
  const pcn_ids = parsePcnIds(formData);

  if (practice_ids.length === 0) {
    return { ok: false, error: "Select at least one practice." };
  }
  if (pcn_ids.length === 0) {
    return { ok: false, error: "Select at least one PCN." };
  }

  if (auth.profile.practice_id) {
    if (!practicesAllowedForManager(practice_ids, auth.profile.practice_id)) {
      return { ok: false, error: "Unauthorized" };
    }
  }

  const { error } = await updateClinician({
    id,
    name,
    role,
    clinician_type_id,
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

export async function deleteClinicianAction(
  clinicianId: string,
): Promise<DeleteClinicianResult> {
  const auth = await requireProfileSession();
  if ("error" in auth) {
    return { error: auth.error };
  }

  const allowed = await userHasPermission(
    auth.profile.id,
    "clinicians.delete",
  );
  if (!allowed) {
    return { error: "Unauthorized" };
  }

  const id = clinicianId.trim();
  if (!id) {
    return { error: "Missing clinician id" };
  }

  const { error } = await deleteClinician(id);
  if (error) {
    return { error };
  }

  revalidatePath("/clinicians", "page");
  revalidatePath("/", "page");
  revalidatePath("/activity", "page");
  revalidatePath("/reporting", "page");
  return { success: true };
}
