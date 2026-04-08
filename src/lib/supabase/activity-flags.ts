import type { Database } from "./database.types";
import { createClient } from "./server";

export type ActivityFlagRow =
  Database["public"]["Tables"]["activity_flags"]["Row"];

export type ActivityFlagListItem = ActivityFlagRow & {
  practice_id: string;
  clinician_id: string;
};

const DEFAULT_FLAG_STATUS = "open";

export async function createFlag(
  logId: string,
  reason: string,
): Promise<{ data: ActivityFlagRow | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "Not authenticated." };
  }

  const trimmed = reason.trim();
  if (!trimmed) {
    return { data: null, error: "Reason is required." };
  }

  const { data, error } = await supabase
    .from("activity_flags")
    .insert({
      log_id: logId,
      flagged_by: user.id,
      reason: trimmed,
      status: DEFAULT_FLAG_STATUS,
    })
    .select()
    .single();

  if (error) {
    console.error("[createFlag]", error.message);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function resolveFlag(
  flagId: string,
  note: string,
): Promise<{ data: ActivityFlagRow | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "Not authenticated." };
  }

  const { data, error } = await supabase
    .from("activity_flags")
    .update({
      status: "resolved",
      resolved_by: user.id,
      resolution_note: note.trim() || null,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", flagId)
    .select()
    .single();

  if (error) {
    console.error("[resolveFlag]", error.message);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Flags for activity logs belonging to any of the given practices.
 */
export async function listFlags(
  practiceIds: string[],
): Promise<ActivityFlagListItem[]> {
  if (practiceIds.length === 0) {
    return [];
  }

  const supabase = await createClient();

  const { data: logs, error: logsError } = await supabase
    .from("activity_logs")
    .select("id, practice_id, clinician_id")
    .in("practice_id", practiceIds);

  if (logsError) {
    console.error("[listFlags] activity_logs", logsError.message);
    return [];
  }

  const logRows = logs ?? [];
  if (logRows.length === 0) {
    return [];
  }

  const logMeta = new Map<
    string,
    { practice_id: string; clinician_id: string }
  >();
  const logIds: string[] = [];
  for (const row of logRows) {
    logIds.push(row.id);
    logMeta.set(row.id, {
      practice_id: row.practice_id,
      clinician_id: row.clinician_id,
    });
  }

  const { data: flags, error: flagsError } = await supabase
    .from("activity_flags")
    .select("*")
    .in("log_id", logIds)
    .order("created_at", { ascending: false });

  if (flagsError) {
    console.error("[listFlags] activity_flags", flagsError.message);
    return [];
  }

  return (flags ?? [])
    .map((flag) => {
      const meta = logMeta.get(flag.log_id);
      if (!meta) return null;
      return {
        ...flag,
        practice_id: meta.practice_id,
        clinician_id: meta.clinician_id,
      };
    })
    .filter((row): row is ActivityFlagListItem => row != null);
}
