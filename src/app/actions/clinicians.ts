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

  const { error } = await createClinician({ name });
  if (error) {
    return { ok: false, error };
  }

  revalidatePath("/", "page");
  revalidatePath("/clinicians", "page");
  return { ok: true };
}
