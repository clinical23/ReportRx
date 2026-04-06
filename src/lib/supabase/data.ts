import { londonMonthRangeISO } from "@/lib/datetime";

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

/** Activity log and other call sites — minimal fields only */
export type ClinicianListItem = {
  id: string;
  name: string;
  role: string;
};

export async function listClinicians(): Promise<ClinicianListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clinicians")
    .select("id, name, role")
    .order("name", { ascending: true });

  if (error) {
    console.error("[listClinicians]", error.message);
    return [];
  }

  return (data ?? []) as ClinicianListItem[];
}

export type ClinicianDirectoryRow = {
  id: string;
  name: string;
  role: string;
  pcn_name: string | null;
  created_at: string;
  practice_names: string[];
  practice_ids: string[];
  hours_this_month: number;
};

async function getClinicianHoursThisMonthMap(): Promise<Map<string, number>> {
  const { from, to } = londonMonthRangeISO();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_logs")
    .select("clinician_id, hours_worked")
    .gte("log_date", from)
    .lte("log_date", to);

  if (error) {
    console.error("[getClinicianHoursThisMonthMap]", error.message);
    return new Map();
  }

  const sums = new Map<string, number>();
  for (const row of data ?? []) {
    const id = String((row as { clinician_id: string }).clinician_id);
    const h = (row as { hours_worked: number | null }).hours_worked;
    const add = h == null ? 0 : Number(h);
    sums.set(id, (sums.get(id) ?? 0) + add);
  }
  return sums;
}

type ClinicianRowDb = {
  id: string;
  name: string;
  role: string;
  created_at: string;
  pcn_name?: string | null;
};

/**
 * Loads clinicians + practice links without nested PostgREST embeds (avoids
 * schema-cache / relationship errors). Merges junction rows in memory.
 */
export async function getClinicians(): Promise<ClinicianDirectoryRow[]> {
  const supabase = await createClient();

  const withPcn = await supabase
    .from("clinicians")
    .select("id, name, role, pcn_name, created_at")
    .order("name", { ascending: true });

  let clinicianRows: ClinicianRowDb[];

  if (!withPcn.error && withPcn.data) {
    clinicianRows = withPcn.data as ClinicianRowDb[];
  } else if (withPcn.error) {
    const msg = withPcn.error.message.toLowerCase();
    const missingColumn =
      msg.includes("pcn_name") ||
      (msg.includes("column") && msg.includes("does not exist"));
    if (!missingColumn) {
      console.error("[getClinicians] clinicians", withPcn.error.message);
      return [];
    }
    const legacy = await supabase
      .from("clinicians")
      .select("id, name, role, created_at")
      .order("name", { ascending: true });
    if (legacy.error || !legacy.data) {
      console.error("[getClinicians] clinicians", legacy.error?.message);
      return [];
    }
    clinicianRows = (legacy.data as Omit<ClinicianRowDb, "pcn_name">[]).map(
      (r) => ({ ...r, pcn_name: null }),
    );
  } else {
    return [];
  }

  const [hoursMap, linksRes, practicesRes] = await Promise.all([
    getClinicianHoursThisMonthMap(),
    supabase.from("clinician_practices").select("clinician_id, practice_id"),
    supabase.from("practices").select("id, name"),
  ]);

  if (linksRes.error) {
    console.error(
      "[getClinicians] clinician_practices",
      linksRes.error.message,
    );
  }
  if (practicesRes.error) {
    console.error("[getClinicians] practices", practicesRes.error.message);
  }

  const nameByPracticeId = new Map<string, string>();
  for (const p of practicesRes.data ?? []) {
    const row = p as { id: string; name: string };
    nameByPracticeId.set(row.id, row.name);
  }

  const linksByClinician = new Map<
    string,
    { practice_ids: string[]; practice_names: string[] }
  >();

  if (!linksRes.error && linksRes.data) {
    for (const raw of linksRes.data as {
      clinician_id: string;
      practice_id: string;
    }[]) {
      const cid = raw.clinician_id;
      const pid = raw.practice_id;
      if (!linksByClinician.has(cid)) {
        linksByClinician.set(cid, { practice_ids: [], practice_names: [] });
      }
      const g = linksByClinician.get(cid)!;
      g.practice_ids.push(pid);
      const pn = nameByPracticeId.get(pid);
      if (pn) g.practice_names.push(pn);
    }
  }

  for (const g of linksByClinician.values()) {
    g.practice_names.sort((a, b) => a.localeCompare(b));
  }

  return clinicianRows.map((r) => {
    const links = linksByClinician.get(r.id) ?? {
      practice_ids: [],
      practice_names: [],
    };
    const rawHours = hoursMap.get(r.id) ?? 0;
    return {
      id: r.id,
      name: r.name,
      role: r.role,
      pcn_name: r.pcn_name ?? null,
      created_at: r.created_at,
      practice_ids: links.practice_ids,
      practice_names: links.practice_names,
      hours_this_month: Math.round(rawHours * 10) / 10,
    };
  });
}

export async function createClinician(input: {
  name: string;
  role?: string;
  pcn_name?: string | null;
  practice_ids: string[];
}): Promise<{ clinician: Clinician | null; error: string | null }> {
  const name = input.name.trim();
  if (!name) {
    return { clinician: null, error: "Name is required" };
  }

  const role = (input.role ?? "Clinician").trim() || "Clinician";
  const pcn =
    input.pcn_name && input.pcn_name.trim() !== ""
      ? input.pcn_name.trim()
      : null;

  const supabase = await createClient();
  const { data: clinician, error } = await supabase
    .from("clinicians")
    .insert({ name, role, pcn_name: pcn })
    .select()
    .single();

  if (error || !clinician) {
    console.error("[createClinician]", error?.message);
    return { clinician: null, error: error?.message ?? "Insert failed" };
  }

  const ids = [...new Set(input.practice_ids.filter(Boolean))];
  if (ids.length > 0) {
    const { error: linkError } = await supabase.from("clinician_practices").insert(
      ids.map((practice_id) => ({
        clinician_id: clinician.id,
        practice_id,
      })),
    );
    if (linkError) {
      console.error("[createClinician] links", linkError.message);
      return {
        clinician: null,
        error: linkError.message,
      };
    }
  }

  return { clinician, error: null };
}

export async function updateClinician(input: {
  id: string;
  name: string;
  role: string;
  pcn_name: string | null;
  practice_ids: string[];
}): Promise<{ error: string | null }> {
  const name = input.name.trim();
  if (!name) {
    return { error: "Name is required" };
  }

  const role = input.role.trim() || "Clinician";
  const pcn =
    input.pcn_name && input.pcn_name.trim() !== ""
      ? input.pcn_name.trim()
      : null;

  const supabase = await createClient();

  const { error: upError } = await supabase
    .from("clinicians")
    .update({ name, role, pcn_name: pcn })
    .eq("id", input.id);

  if (upError) {
    console.error("[updateClinician]", upError.message);
    return { error: upError.message };
  }

  const { error: delError } = await supabase
    .from("clinician_practices")
    .delete()
    .eq("clinician_id", input.id);

  if (delError) {
    console.error("[updateClinician] delete links", delError.message);
    return { error: delError.message };
  }

  const ids = [...new Set(input.practice_ids.filter(Boolean))];
  if (ids.length > 0) {
    const { error: insError } = await supabase.from("clinician_practices").insert(
      ids.map((practice_id) => ({
        clinician_id: input.id,
        practice_id,
      })),
    );
    if (insError) {
      console.error("[updateClinician] insert links", insError.message);
      return { error: insError.message };
    }
  }

  return { error: null };
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
