"use server";

import { revalidatePath } from "next/cache";

import { createClinician } from "@/lib/supabase/data";

export type AddClinicianResult =
  | { ok: true }
  | { ok: false; error: string };

export async function addClinicianAction(
  formData: FormData,
): Promise<AddClinicianResult> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { ok: false, error: "Name is required" };
  }

  const practiceRaw = String(formData.get("practice_id") ?? "").trim();
  const practice_id = practiceRaw.length > 0 ? practiceRaw : null;

  const { error } = await createClinician({ name, practice_id });
  if (error) {
    return { ok: false, error };
  }

  revalidatePath("/", "page");
  revalidatePath("/clinicians", "page");
  revalidatePath("/reporting", "page");
  return { ok: true };
}
