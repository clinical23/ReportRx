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

function parsePcnIds(formData: FormData): string[] {
  const all = formData.getAll("pcn_ids");
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
  const practice_ids = parsePracticeIds(formData);
  const pcn_ids = parsePcnIds(formData);

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
