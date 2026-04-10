import { getProfile } from "@/lib/supabase/auth";
import {
  getAppointmentsByCategory,
  getAppointmentsByPractice,
  getClinicianBreakdown,
  getReportingSummary,
  listReportingPractices,
  resolveReportingPracticeScope,
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
  pcn?: string;
  practice?: string;
}): Promise<MonthlyReportViewProps> {
  const profile = await getProfile();
  const { safeStart, safeEnd } = resolveReportDateRange(sp);

  const practices = await listReportingPractices(profile.organisation_id);
  const practiceScope = resolveReportingPracticeScope(
    practices,
    sp.pcn?.trim(),
    sp.practice?.trim(),
  );

  const generatedAt = new Date();
  const generatedAtLabel = generatedAt.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const periodLabel = `${safeStart} → ${safeEnd}`;

  const [orgName, summary, byCategory, byPractice, clinicianBreakdown] =
    await Promise.all([
      getOrganisationName(profile.organisation_id),
      getReportingSummary(safeStart, safeEnd, practiceScope),
      getAppointmentsByCategory(safeStart, safeEnd, practiceScope),
      getAppointmentsByPractice(safeStart, safeEnd, practiceScope),
      getClinicianBreakdown(safeStart, safeEnd, practiceScope),
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
