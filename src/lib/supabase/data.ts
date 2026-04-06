import { unstable_noStore as noStore } from "next/cache";

import type {
  TaskBatch,
  Task,
  TaskWithClinician,
  Clinician,
} from "./database.types";
import { createClient } from "./server";

export type NewTaskBatch = {
  title: string;
  due_at?: string | null;
  total_tasks: number;
  completed_tasks?: number;
  clinician_id?: string | null;
};

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

/**
 * Loads from public.tasks, then resolves clinician names by clinician_id → clinicians.id.
 * Avoids PostgREST embeds (which often error if the relationship is missing from the schema cache),
 * so task rows still render even when the clinicians lookup fails.
 */
export async function listTasksWithClinicians(): Promise<TaskWithClinician[]> {
  noStore();
  const supabase = await createClient();

  const { data: taskRows, error: tasksError } = await supabase
    .from("tasks")
    .select("id, title, status, clinician_id, created_at")
    .order("created_at", { ascending: false });

  if (tasksError) {
    console.error("[listTasksWithClinicians] tasks", tasksError.message);
    return [];
  }

  const tasks = taskRows ?? [];
  if (tasks.length === 0) {
    return [];
  }

  const { data: clinicianRows, error: cliniciansError } = await supabase
    .from("clinicians")
    .select("id, name");

  if (cliniciansError) {
    console.error(
      "[listTasksWithClinicians] clinicians",
      cliniciansError.message,
    );
  }

  const nameById = new Map(
    (clinicianRows ?? []).map((c) => [c.id, c.name] as const),
  );

  return tasks.map((t) => ({
    ...t,
    clinicians:
      t.clinician_id != null
        ? {
            name: nameById.get(t.clinician_id) ?? "—",
          }
        : null,
  }));
}

export async function insertTask(input: {
  title: string;
  clinician_id: string;
}): Promise<{ task: Task | null; error: string | null }> {
  const title = input.title.trim();
  if (!title) {
    return { task: null, error: "Title is required" };
  }

  const clinician_id = input.clinician_id.trim();
  if (!clinician_id) {
    return { task: null, error: "Clinician is required" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title,
      clinician_id,
      status: "Open",
    })
    .select()
    .single();

  if (error) {
    console.error("[insertTask]", error.message);
    return { task: null, error: error.message };
  }

  return { task: data, error: null };
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

export async function createTaskBatch(
  input: NewTaskBatch,
): Promise<{ batch: TaskBatch | null; error: string | null }> {
  const supabase = await createClient();
  const completed = input.completed_tasks ?? 0;

  const { data, error } = await supabase
    .from("task_batches")
    .insert({
      title: input.title,
      due_at: input.due_at ?? null,
      total_tasks: input.total_tasks,
      completed_tasks: completed,
      clinician_id: input.clinician_id ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("[createTaskBatch]", error.message);
    return { batch: null, error: error.message };
  }

  return { batch: data, error: null };
}

export async function updateTaskProgress(
  id: string,
  completed_tasks: number,
): Promise<{ batch: TaskBatch | null; error: string | null }> {
  const supabase = await createClient();

  const { data: current, error: fetchError } = await supabase
    .from("task_batches")
    .select("total_tasks")
    .eq("id", id)
    .single();

  if (fetchError || !current) {
    const msg = fetchError?.message ?? "Batch not found";
    console.error("[updateTaskProgress]", msg);
    return { batch: null, error: msg };
  }

  const clamped = Math.max(
    0,
    Math.min(completed_tasks, current.total_tasks),
  );

  const { data, error } = await supabase
    .from("task_batches")
    .update({
      completed_tasks: clamped,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[updateTaskProgress]", error.message);
    return { batch: null, error: error.message };
  }

  return { batch: data, error: null };
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
