/**
 * Values that may appear as activity_logs.clinician_id for the current profile.
 * Logs are keyed by auth user id; some legacy rows may use profiles.clinician_id.
 */
export function activityClinicianKeys(profile: {
  id: string
  clinician_id: string | null
}): string[] {
  return [
    ...new Set(
      [profile.id, profile.clinician_id].filter((x): x is string => Boolean(x)),
    ),
  ]
}
