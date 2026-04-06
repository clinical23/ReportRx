import type { TaskBatch, Clinician } from "./database.types";
import { createClient } from "./server";

export async function getTasks(): Promise<TaskBatch[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_batches")
    .select("*")
    .order("due_at", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("[getTasks]", error.message);
    return [];
  }

  return data ?? [];
}

export async function getClinicians(): Promise<Clinician[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clinicians")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("[getClinicians]", error.message);
    return [];
  }

  return data ?? [];
}

/** Same data as {@link getClinicians}; used by activity and other call sites. */
export async function listClinicians(): Promise<Clinician[]> {
  return getClinicians();
}

export async function createClinician(input: {
  name: string;
}): Promise<{ clinician: Clinician | null; error: string | null }> {
  const name = input.name.trim();
  if (!name) {
    return { clinician: null, error: "Name is required" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clinicians")
    .insert({ name, role: "Clinician" })
    .select()
    .single();

  if (error) {
    console.error("[createClinician]", error.message);
    return { clinician: null, error: error.message };
  }

  return { clinician: data, error: null };
}

export type TaskBatchMetrics = {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  openTasks: number;
};

export function computeTaskBatchMetrics(batches: TaskBatch[]): TaskBatchMetrics {
  const totalTasks = batches.reduce((sum, b) => sum + b.total_tasks, 0);
  const completedTasks = batches.reduce((sum, b) => sum + b.completed_tasks, 0);
  const openTasks = batches.reduce(
    (sum, b) => sum + Math.max(0, b.total_tasks - b.completed_tasks),
    0,
  );
  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 1000) / 10 : 0;

  return {
    totalTasks,
    completedTasks,
    completionRate,
    openTasks,
  };
}
