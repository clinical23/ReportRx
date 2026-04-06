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

export type ClinicianWithPractice = Clinician & {
  practice_name: string | null;
};

export async function getClinicians(): Promise<ClinicianWithPractice[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clinicians")
    .select("id, name, role, active_caseload, created_at, practice_id, practices(name)")
    .order("name", { ascending: true });

  if (error) {
    console.error("[getClinicians]", error.message);
    return [];
  }

  const rows = data ?? [];
  return rows.map((row) => {
    const r = row as Clinician & {
      practices: { name: string } | null;
    };
    return {
      id: r.id,
      name: r.name,
      role: r.role,
      active_caseload: r.active_caseload,
      created_at: r.created_at,
      practice_id: r.practice_id ?? null,
      practice_name: r.practices?.name ?? null,
    };
  });
}

/** Same data as {@link getClinicians}; used by activity and other call sites. */
export async function listClinicians(): Promise<Clinician[]> {
  return getClinicians();
}

export async function createClinician(input: {
  name: string;
  practice_id?: string | null;
}): Promise<{ clinician: Clinician | null; error: string | null }> {
  const name = input.name.trim();
  if (!name) {
    return { clinician: null, error: "Name is required" };
  }

  const practice_id =
    input.practice_id && input.practice_id.trim() !== ""
      ? input.practice_id.trim()
      : null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clinicians")
    .insert({ name, role: "Clinician", practice_id })
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
