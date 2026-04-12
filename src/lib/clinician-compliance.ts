import type { Database } from "@/lib/supabase/database.types";

export type ClinicianDetailsRow =
  Database["public"]["Tables"]["clinician_details"]["Row"];

export const CLINICAL_ROLE_OPTIONS = [
  "Pharmacist",
  "Pharmacy Technician",
  "Paramedic",
  "Social Prescriber",
  "Physician Associate",
  "Dietitian",
  "Podiatrist",
  "Occupational Therapist",
  "Other",
] as const;

export const DOCUMENT_TYPE_OPTIONS = [
  "Contract spec sheet",
  "Key notes",
  "DBS certificate",
  "Indemnity certificate",
  "Other",
] as const;

export type ComplianceStatus = "ok" | "warning" | "bad" | "na";

/** Days from today to date string YYYY-MM-DD (UTC calendar). */
export function daysFromToday(dateStr: string | null | undefined): number | null {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return null;
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  const target = Date.UTC(y, m - 1, d);
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((target - today) / 86400000);
}

export function expiryBadgeTone(
  dateStr: string | null | undefined,
): "ok" | "warning" | "bad" | "none" {
  if (!dateStr?.trim()) return "none";
  const days = daysFromToday(dateStr);
  if (days === null) return "none";
  if (days < 0) return "bad";
  if (days <= 30) return "warning";
  return "ok";
}

/**
 * Table indicator: required = GPhC, DBS + expiry, indemnity provider/number + expiry.
 */
export function computeComplianceStatus(
  row: ClinicianDetailsRow | null | undefined,
): ComplianceStatus {
  if (!row) return "bad";

  const gphc = row.gphc_number?.trim();
  const dbs = row.dbs_number?.trim();
  const dbsExp = row.dbs_expiry?.trim();
  const indProv = row.indemnity_provider?.trim();
  const indNum = row.indemnity_number?.trim();
  const indExp = row.indemnity_expiry?.trim();

  if (!gphc || !dbs || !dbsExp || !indProv || !indNum || !indExp) {
    return "bad";
  }

  const dbsDays = daysFromToday(dbsExp);
  const indDays = daysFromToday(indExp);
  if (dbsDays === null || indDays === null) return "bad";
  if (dbsDays < 0 || indDays < 0) return "bad";
  if (dbsDays <= 30 || indDays <= 30) return "warning";
  return "ok";
}
