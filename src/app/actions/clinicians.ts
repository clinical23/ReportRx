"use server";

import { revalidatePath } from "next/cache";

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

export async function addClinicianAction(
  formData: FormData,
): Promise<ClinicianMutationResult> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { ok: false, error: "Name is required" };
  }

  const role = String(formData.get("role") ?? "Clinician").trim() || "Clinician";
  const pcnRaw = String(formData.get("pcn_name") ?? "").trim();
  const pcn_name = pcnRaw.length > 0 ? pcnRaw : null;
  const practice_ids = parsePracticeIds(formData);

  const { error } = await createClinician({
    name,
    role,
    pcn_name,
    practice_ids,
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
  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    return { ok: false, error: "Missing clinician id" };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { ok: false, error: "Name is required" };
  }

  const role = String(formData.get("role") ?? "").trim() || "Clinician";
  const pcnRaw = String(formData.get("pcn_name") ?? "").trim();
  const pcn_name = pcnRaw.length > 0 ? pcnRaw : null;
  const practice_ids = parsePracticeIds(formData);

  const { error } = await updateClinician({
    id,
    name,
    role,
    pcn_name,
    practice_ids,
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
