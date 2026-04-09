import { getProfile } from '@/lib/supabase/auth'
import {
  getAppointmentsByCategory,
  getAppointmentsByPractice,
  getClinicianBreakdown,
  getDailyTrend,
  getDataCompleteness,
  getRecentLogs,
  getReportingSummary,
} from '@/lib/supabase/reporting'
import { ReportingDashboardClient } from './reporting-dashboard-client'

export const dynamic = "force-dynamic";

export default async function ReportingPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  await getProfile()
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

  const [
    summary,
    byCategory,
    byPractice,
    dailyTrend,
    clinicianBreakdown,
    recentLogs,
    dataCompleteness,
  ] = await Promise.all([
    getReportingSummary(safeStart, safeEnd),
    getAppointmentsByCategory(safeStart, safeEnd),
    getAppointmentsByPractice(safeStart, safeEnd),
    getDailyTrend(safeStart, safeEnd),
    getClinicianBreakdown(safeStart, safeEnd),
    getRecentLogs(10),
    getDataCompleteness(safeStart, safeEnd),
  ])

  return (
    <ReportingDashboardClient
      startDate={safeStart}
      endDate={safeEnd}
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
