import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

export type ClinicianPracticeAssignmentRow = {
  clinician_id: string;
  practice_id: string;
};

/** All assignment rows for an organisation (admin UI + directory). */
export async function listOrgClinicianPracticeAssignments(
  organisationId: string,
): Promise<ClinicianPracticeAssignmentRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clinician_practice_assignments")
    .select("clinician_id, practice_id")
    .eq("organisation_id", organisationId);

  if (error) {
    console.error(
      "[listOrgClinicianPracticeAssignments]",
      error.message,
    );
    return [];
  }

  return (data ?? []).map((row) => ({
    clinician_id: String(row.clinician_id),
    practice_id: String(row.practice_id),
  }));
}

/** Distinct practice IDs assigned to a profile (clinician). Empty = no restriction (full access). */
export async function getAssignedPracticeIdsForProfileWithClient(
  supabase: SupabaseClient,
  profileId: string,
  organisationId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("clinician_practice_assignments")
    .select("practice_id")
    .eq("clinician_id", profileId)
    .eq("organisation_id", organisationId);

  if (error) {
    console.error("[getAssignedPracticeIdsForProfile]", error.message);
    return [];
  }

  return [...new Set((data ?? []).map((r) => String(r.practice_id)))];
}

export async function getAssignedPracticeIdsForProfile(
  profileId: string,
  organisationId: string,
): Promise<string[]> {
  const supabase = await createClient();
  return getAssignedPracticeIdsForProfileWithClient(
    supabase,
    profileId,
    organisationId,
  );
}

export function isClinicianOnlyActivityRole(role: string | null): boolean {
  return role === "clinician";
}
