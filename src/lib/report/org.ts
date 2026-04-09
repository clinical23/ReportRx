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

/** Default working hours for activity log forms (from organisations.settings). */
export function parseDefaultHoursPerDay(settings: unknown): number {
  if (
    settings &&
    typeof settings === "object" &&
    settings !== null &&
    "default_hours_per_day" in settings
  ) {
    const v = (settings as { default_hours_per_day: unknown })
      .default_hours_per_day;
    if (typeof v === "number" && Number.isFinite(v) && v > 0 && v <= 24) {
      return v;
    }
    if (typeof v === "string") {
      const n = parseFloat(v);
      if (Number.isFinite(n) && n > 0 && n <= 24) {
        return n;
      }
    }
  }
  return 7.5;
}
