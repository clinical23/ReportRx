import { getProfile } from "@/lib/supabase/auth";
import {
  getAppointmentsByCategory,
  getAppointmentsByPractice,
  getClinicianBreakdown,
  getReportingSummary,
} from "@/lib/supabase/reporting";

import { getOrganisationName } from "./org";
import type { MonthlyReportViewProps } from "./types";

export function resolveReportDateRange(sp: {
  start?: string;
  end?: string;
}): { safeStart: string; safeEnd: string } {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const defaultStart = `${yyyy}-${mm}-01`;
  const defaultEnd = `${yyyy}-${mm}-${dd}`;

  const start = sp.start?.slice(0, 10) || defaultStart;
  const end = sp.end?.slice(0, 10) || defaultEnd;
  const safeStart = start <= end ? start : end;
  const safeEnd = start <= end ? end : start;
  return { safeStart, safeEnd };
}

export async function loadMonthlyReportViewProps(sp: {
  start?: string;
  end?: string;
}): Promise<MonthlyReportViewProps> {
  const profile = await getProfile();
  const { safeStart, safeEnd } = resolveReportDateRange(sp);

  const generatedAt = new Date();
  const generatedAtLabel = generatedAt.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const periodLabel = `${safeStart} → ${safeEnd}`;

  const [orgName, summary, byCategory, byPractice, clinicianBreakdown] =
    await Promise.all([
      getOrganisationName(profile.organisation_id),
      getReportingSummary(safeStart, safeEnd),
      getAppointmentsByCategory(safeStart, safeEnd),
      getAppointmentsByPractice(safeStart, safeEnd),
      getClinicianBreakdown(safeStart, safeEnd),
    ]);

  const organisationName = orgName ?? "Organisation";

  return {
    organisationName,
    periodLabel,
    generatedAtLabel,
    summary,
    practicesCovered: byPractice.length,
    byCategory,
    byPractice,
    clinicianBreakdown,
  };
}
