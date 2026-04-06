"use server";

import { revalidatePath } from "next/cache";

import { createTaskBatch, updateTaskProgress } from "@/lib/supabase/data";
import { createClient } from "@/lib/supabase/server";

export async function incrementTaskBatchProgressAction(batchId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_batches")
    .select("completed_tasks, total_tasks")
    .eq("id", batchId)
    .single();

  if (error || !data) {
    return { ok: false as const, error: error?.message ?? "Batch not found" };
  }

  if (data.completed_tasks >= data.total_tasks) {
    return { ok: true as const };
  }

  const result = await updateTaskProgress(
    batchId,
    data.completed_tasks + 1,
  );

  if (result.error) {
    return { ok: false as const, error: result.error };
  }

  revalidatePath("/");
  revalidatePath("/tasks");
  return { ok: true as const };
}

export async function createTaskBatchAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const totalRaw = Number(formData.get("total_tasks"));
  const dueRaw = formData.get("due_at");
  const due_at =
    dueRaw && String(dueRaw).length > 0 ? String(dueRaw) : null;

  if (!title) {
    return { ok: false as const, error: "Title is required" };
  }

  if (!Number.isFinite(totalRaw) || totalRaw < 1) {
    return { ok: false as const, error: "Enter a valid number of tasks (≥ 1)" };
  }

  const { error } = await createTaskBatch({
    title,
    total_tasks: Math.floor(totalRaw),
    due_at,
  });

  if (error) {
    return { ok: false as const, error };
  }

  revalidatePath("/");
  revalidatePath("/tasks");
  return { ok: true as const };
}

export type CreateTaskBatchFormState = { error: string } | null;

export async function createTaskBatchFormAction(
  _prev: CreateTaskBatchFormState,
  formData: FormData,
): Promise<CreateTaskBatchFormState> {
  const result = await createTaskBatchAction(formData);
  if (!result.ok) {
    return { error: result.error };
  }
  return null;
}
