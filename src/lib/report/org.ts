import { createClient } from "@/lib/supabase/server";

export type OrganisationSettingsRecord = {
  id: string;
  name: string;
  slug: string | null;
  settings: Record<string, unknown> | null;
};

export async function getOrganisationName(
  organisationId: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organisations")
    .select("name")
    .eq("id", organisationId)
    .maybeSingle();

  if (error) {
    console.error("[getOrganisationName]", error.message);
    return null;
  }
  return data?.name?.trim() || null;
}

export async function getOrganisationSettingsRecord(
  organisationId: string,
): Promise<OrganisationSettingsRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organisations")
    .select("id, name, slug, settings")
    .eq("id", organisationId)
    .maybeSingle();

  if (error) {
    console.error("[getOrganisationSettingsRecord]", error.message);
    return null;
  }
  if (!data) {
    return null;
  }
  const row = data as Record<string, unknown>;
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? "").trim() || "—",
    slug: row.slug == null ? null : String(row.slug),
    settings:
      row.settings && typeof row.settings === "object"
        ? (row.settings as Record<string, unknown>)
        : null,
  };
}

function parseHoursField(
  settings: Record<string, unknown> | null,
  keys: string[],
  max: number,
  fallback: number,
): number {
  if (!settings) return fallback;
  for (const key of keys) {
    if (!(key in settings)) continue;
    const v = settings[key];
    if (typeof v === "number" && Number.isFinite(v) && v > 0 && v <= max) {
      return v;
    }
    if (typeof v === "string") {
      const n = parseFloat(v);
      if (Number.isFinite(n) && n > 0 && n <= max) {
        return n;
      }
    }
  }
  return fallback;
}

/** Default hours in a working day for activity log forms (organisations.settings). */
export function parseDefaultDailyHours(settings: unknown): number {
  if (!settings || typeof settings !== "object" || settings === null) {
    return 7.5;
  }
  const o = settings as Record<string, unknown>;
  return parseHoursField(o, ["default_daily_hours", "default_hours_per_day"], 24, 7.5);
}

/** Default hours in a working week (organisations.settings). */
export function parseDefaultWeeklyHours(settings: unknown): number {
  if (!settings || typeof settings !== "object" || settings === null) {
    return 37.5;
  }
  const o = settings as Record<string, unknown>;
  return parseHoursField(o, ["default_weekly_hours"], 80, 37.5);
}

/** @deprecated Use parseDefaultDailyHours — kept for call sites that still use the old name. */
export function parseDefaultHoursPerDay(settings: unknown): number {
  return parseDefaultDailyHours(settings);
}
