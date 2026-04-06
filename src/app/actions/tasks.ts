"use server";

import { revalidatePath } from "next/cache";

import { insertTask } from "@/lib/supabase/data";
import type { Task } from "@/lib/supabase/database.types";

export type CreateTaskResult =
  | { ok: true; task: Task }
  | { ok: false; error: string };

export async function createTask(formData: FormData): Promise<CreateTaskResult> {
  const title = String(formData.get("title") ?? "").trim();
  const clinician_id = String(formData.get("clinician_id") ?? "").trim();

  if (!title) {
    return { ok: false, error: "Title is required" };
  }
  if (!clinician_id) {
    return { ok: false, error: "Clinician is required" };
  }

  const { task, error } = await insertTask({ title, clinician_id });
  if (error || !task) {
    return { ok: false, error: error ?? "Could not create task" };
  }

  revalidatePath("/tasks");
  revalidatePath("/");
  return { ok: true, task };
}
