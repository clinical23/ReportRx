"use server";

import { revalidatePath } from "next/cache";

import { createPcn, deletePcn } from "@/lib/supabase/data";

export async function createPcnAction(
  name: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
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
  const { error } = await deletePcn(id);
  if (error) {
    return { ok: false, error };
  }
  revalidatePath("/settings");
  revalidatePath("/clinicians");
  return { ok: true };
}
