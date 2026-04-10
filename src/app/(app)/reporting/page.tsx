import { getProfile } from '@/lib/supabase/auth'
import {
  getAppointmentsByCategory,
  getAppointmentsByPractice,
  getClinicianBreakdown,
  getDailyTrend,
  getDataCompleteness,
  getRecentLogs,
  getReportingSummary,
  listReportingPcns,
  listReportingPractices,
  resolveReportingPracticeScope,
} from '@/lib/supabase/reporting'
import { ReportingDashboardClient } from './reporting-dashboard-client'
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Reporting" };

export default async function ReportingPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string; pcn?: string; practice?: string }>;
}) {
  const profile = await getProfile()
  const sp = await searchParams

  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  const defaultStart = `${yyyy}-${mm}-01`
  const defaultEnd = `${yyyy}-${mm}-${dd}`

  const start = sp.start?.slice(0, 10) || defaultStart
  const end = sp.end?.slice(0, 10) || defaultEnd
  const safeStart = start <= end ? start : end
  const safeEnd = start <= end ? end : start

  const pcnParam = sp.pcn?.trim() || undefined
  const practiceParam = sp.practice?.trim() || undefined

  const [pcns, practices] = await Promise.all([
    listReportingPcns(profile.organisation_id),
    listReportingPractices(profile.organisation_id),
  ])

  const practiceScope = resolveReportingPracticeScope(
    practices,
    pcnParam,
    practiceParam,
  )

  const [
    summary,
    byCategory,
    byPractice,
    dailyTrend,
    clinicianBreakdown,
    recentLogs,
    dataCompleteness,
  ] = await Promise.all([
    getReportingSummary(safeStart, safeEnd, practiceScope),
    getAppointmentsByCategory(safeStart, safeEnd, practiceScope),
    getAppointmentsByPractice(safeStart, safeEnd, practiceScope),
    getDailyTrend(safeStart, safeEnd, practiceScope),
    getClinicianBreakdown(safeStart, safeEnd, practiceScope),
    getRecentLogs(10, {
      practiceScope,
      startDate: safeStart,
      endDate: safeEnd,
    }),
    getDataCompleteness(safeStart, safeEnd, practiceScope),
  ])

  return (
    <ReportingDashboardClient
      startDate={safeStart}
      endDate={safeEnd}
      pcns={pcns}
      practices={practices}
      selectedPcnId={pcnParam ?? null}
      selectedPracticeId={practiceParam ?? null}
      summary={summary}
      byCategory={byCategory}
      byPractice={byPractice}
      dailyTrend={dailyTrend}
      clinicianBreakdown={clinicianBreakdown}
      recentLogs={recentLogs}
      dataCompleteness={dataCompleteness}
    />
  );
}
