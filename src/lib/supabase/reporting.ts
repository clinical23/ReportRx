import { getProfile } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/server'

/** Roles expected to submit activity logs (aligned with activity / scope usage). */
const DATA_COMPLETENESS_ROLES = [
  'clinician',
  'manager',
  'practice_manager',
  'pcn_manager',
] as const

type ActivityReportRow = {
  log_id: string | null
  log_date: string | null
  hours_worked: number | null
  clinician_id: string | null
  clinician_name: string | null
  practice_name: string | null
  category_name: string | null
  appointment_count: number | null
  submitted_at: string | null
}

type RecentLogCategory = { name: string; count: number }

export type ReportingSummary = {
  totalAppointments: number
  totalHours: number
  activeClinicians: number
  totalLogs: number
  avgAppointmentsPerDay: number
}

export type CategoryBreakdownItem = {
  category_name: string
  total_count: number
  percentage: number
}

export type PracticeBreakdownItem = {
  practice_name: string
  total_count: number
  total_hours: number
  log_count: number
}

export type DailyTrendItem = {
  date: string
  total_appointments: number
  total_hours: number
}

export type ClinicianBreakdownItem = {
  clinician_name: string
  total_appointments: number
  total_hours: number
  practices_covered: number
  log_count: number
}

export type RecentLogItem = {
  clinician_name: string
  practice_name: string
  log_date: string
  hours_worked: number
  categories: RecentLogCategory[]
}

export type DataCompletenessRow = {
  clinician_name: string
  expected_days: number
  logged_days: number
  missing_days: number
  completeness_pct: number
}

/** Weekday (Mon–Fri) count for ISO calendar dates [start, end], using UTC date arithmetic. */
function countWeekdaysInclusive(startDate: string, endDate: string): number {
  const start = new Date(`${startDate.slice(0, 10)}T00:00:00.000Z`).getTime()
  const end = new Date(`${endDate.slice(0, 10)}T00:00:00.000Z`).getTime()
  if (Number.isNaN(start) || Number.isNaN(end) || start > end) {
    return 0
  }
  let n = 0
  for (let t = start; t <= end; t += 86_400_000) {
    const wd = new Date(t).getUTCDay()
    if (wd >= 1 && wd <= 5) n++
  }
  return n
}

function isUtcWeekdayIso(isoYmd: string): boolean {
  const t = new Date(`${isoYmd.slice(0, 10)}T00:00:00.000Z`).getTime()
  if (Number.isNaN(t)) return false
  const wd = new Date(t).getUTCDay()
  return wd >= 1 && wd <= 5
}

/**
 * Active org members who should log, vs distinct weekdays (Mon–Fri) with any activity_logs row.
 */
export async function getDataCompleteness(
  startDate: string,
  endDate: string,
): Promise<DataCompletenessRow[]> {
  const sessionProfile = await getProfile()
  const supabase = await createClient()
  const expected = countWeekdaysInclusive(startDate, endDate)

  const { data: team, error: teamError } = await supabase
    .from('profiles')
    .select('id, full_name, clinician_id, role')
    .eq('organisation_id', sessionProfile.organisation_id)
    .eq('is_active', true)
    .in('role', [...DATA_COMPLETENESS_ROLES])

  if (teamError) {
    console.error('[getDataCompleteness] profiles', teamError.message)
    return []
  }

  if (expected === 0) {
    return (team ?? []).map((p) => {
      const name = String(p.full_name ?? '').trim() || '—'
      return {
        clinician_name: name,
        expected_days: 0,
        logged_days: 0,
        missing_days: 0,
        completeness_pct: 100,
      }
    })
  }

  const { data: logs, error: logsError } = await supabase
    .from('activity_logs')
    .select('clinician_id, log_date')
    .gte('log_date', startDate.slice(0, 10))
    .lte('log_date', endDate.slice(0, 10))

  if (logsError) {
    console.error('[getDataCompleteness] activity_logs', logsError.message)
    return []
  }

  const logDatesByKey = new Map<string, Set<string>>()
  for (const row of logs ?? []) {
    const cid = row.clinician_id == null ? '' : String(row.clinician_id)
    const dateStr = String(row.log_date ?? '').slice(0, 10)
    if (!cid || !dateStr) continue
    if (dateStr < startDate.slice(0, 10) || dateStr > endDate.slice(0, 10)) continue
    if (!isUtcWeekdayIso(dateStr)) continue
    if (!logDatesByKey.has(cid)) {
      logDatesByKey.set(cid, new Set())
    }
    logDatesByKey.get(cid)!.add(dateStr)
  }

  const rows: DataCompletenessRow[] = []
  for (const p of team ?? []) {
    const name = String(p.full_name ?? '').trim() || '—'
    const ids = new Set<string>()
    ids.add(String(p.id))
    if (p.clinician_id) {
      ids.add(String(p.clinician_id))
    }
    const loggedDates = new Set<string>()
    for (const cid of ids) {
      const dates = logDatesByKey.get(cid)
      if (dates) {
        for (const d of dates) {
          loggedDates.add(d)
        }
      }
    }

    const logged_days = loggedDates.size
    const missing_days = Math.max(0, expected - logged_days)
    const completeness_pct =
      expected > 0 ? Math.round((logged_days / expected) * 1000) / 10 : 100

    rows.push({
      clinician_name: name,
      expected_days: expected,
      logged_days,
      missing_days,
      completeness_pct,
    })
  }

  return rows.sort(
    (a, b) =>
      a.completeness_pct - b.completeness_pct ||
      a.clinician_name.localeCompare(b.clinician_name),
  )
}

export type MyActivitySummary = {
  totalAppointments: number
  totalHours: number
  practicesCovered: number
  daysLogged: number
  totalLogs: number
}

function clinicianKeySet(clinicianIds: readonly string[]): Set<string> {
  return new Set(clinicianIds.map((id) => id.trim()).filter(Boolean))
}

function filterRowsForClinicians(
  rows: ActivityReportRow[],
  keys: Set<string>,
): ActivityReportRow[] {
  if (keys.size === 0) return []
  return rows.filter(
    (r) => r.clinician_id != null && keys.has(String(r.clinician_id)),
  )
}

/**
 * Personal reporting metrics for the given activity_report clinician_id value(s).
 * Pass profile.id and profiles.clinician_id when both may appear on logs.
 */
export async function getMyStats(
  clinicianIds: readonly string[],
  startDate: string,
  endDate: string,
): Promise<MyActivitySummary> {
  const empty: MyActivitySummary = {
    totalAppointments: 0,
    totalHours: 0,
    practicesCovered: 0,
    daysLogged: 0,
    totalLogs: 0,
  }
  const keys = clinicianKeySet(clinicianIds)
  if (keys.size === 0) return empty

  const rows = filterRowsForClinicians(
    await fetchRowsForRange(startDate, endDate),
    keys,
  )

  const totalAppointments = rows.reduce(
    (sum, row) => sum + Number(row.appointment_count ?? 0),
    0,
  )
  const uniqueLogs = new Set(rows.map((r) => r.log_id).filter(Boolean))
  const uniqueDays = new Set(
    rows.map((r) => r.log_date?.slice(0, 10)).filter(Boolean),
  )
  const practices = new Set(
    rows
      .map((r) => (r.practice_name ?? '').trim())
      .filter((name) => name.length > 0),
  )
  const totalHours = Array.from(hoursByUniqueLog(rows).values()).reduce(
    (sum, h) => sum + h,
    0,
  )

  return {
    totalAppointments,
    totalHours: Math.round(totalHours * 10) / 10,
    practicesCovered: practices.size,
    daysLogged: uniqueDays.size,
    totalLogs: uniqueLogs.size,
  }
}

export async function getMyCategoryBreakdown(
  clinicianIds: readonly string[],
  startDate: string,
  endDate: string,
): Promise<CategoryBreakdownItem[]> {
  const keys = clinicianKeySet(clinicianIds)
  if (keys.size === 0) return []

  const rows = filterRowsForClinicians(
    await fetchRowsForRange(startDate, endDate),
    keys,
  )
  const totals = new Map<string, number>()
  let grandTotal = 0

  for (const row of rows) {
    const name = (row.category_name ?? 'Uncategorised').trim() || 'Uncategorised'
    const count = Number(row.appointment_count ?? 0)
    totals.set(name, (totals.get(name) ?? 0) + count)
    grandTotal += count
  }

  return Array.from(totals.entries())
    .map(([category_name, total_count]) => ({
      category_name,
      total_count,
      percentage:
        grandTotal > 0 ? Math.round((total_count / grandTotal) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.total_count - a.total_count)
}

export async function getMyRecentLogs(
  limit: number,
  clinicianIds: readonly string[],
): Promise<RecentLogItem[]> {
  const keys = clinicianKeySet(clinicianIds)
  if (keys.size === 0) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('activity_report')
    .select(
      'log_id, log_date, hours_worked, clinician_id, clinician_name, practice_name, category_name, appointment_count, submitted_at',
    )
    .order('submitted_at', { ascending: false })
    .limit(300)

  if (error) {
    console.error('[getMyRecentLogs]', error.message)
    return []
  }

  const filtered = filterRowsForClinicians(
    (data ?? []) as ActivityReportRow[],
    keys,
  )

  const grouped = new Map<string, RecentLogItem>()
  for (const row of filtered) {
    if (!row.log_id) continue
    if (!grouped.has(row.log_id)) {
      grouped.set(row.log_id, {
        clinician_name:
          (row.clinician_name ?? 'Unknown clinician').trim() ||
          'Unknown clinician',
        practice_name:
          (row.practice_name ?? 'Unknown practice').trim() || 'Unknown practice',
        log_date: row.log_date?.slice(0, 10) ?? '',
        hours_worked: Number(row.hours_worked ?? 0),
        categories: [],
      })
    }
    const g = grouped.get(row.log_id)
    if (!g) continue
    g.categories.push({
      name: (row.category_name ?? 'Uncategorised').trim() || 'Uncategorised',
      count: Number(row.appointment_count ?? 0),
    })
    if (!g.log_date && row.log_date) {
      g.log_date = row.log_date.slice(0, 10)
    }
  }

  return Array.from(grouped.values()).slice(0, limit)
}

async function fetchRowsForRange(
  startDate: string,
  endDate: string,
): Promise<ActivityReportRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('activity_report')
    .select(
      'log_id, log_date, hours_worked, clinician_id, clinician_name, practice_name, category_name, appointment_count, submitted_at',
    )
    .gte('log_date', startDate)
    .lte('log_date', endDate)

  if (error) {
    console.error('[reporting.fetchRowsForRange]', error.message)
    return []
  }

  return (data ?? []) as ActivityReportRow[]
}

function hoursByUniqueLog(rows: ActivityReportRow[]): Map<string, number> {
  const byLog = new Map<string, number>()
  for (const row of rows) {
    if (!row.log_id) continue
    if (!byLog.has(row.log_id)) {
      byLog.set(row.log_id, Number(row.hours_worked ?? 0))
    }
  }
  return byLog
}

export async function getReportingSummary(startDate: string, endDate: string): Promise<ReportingSummary> {
  const rows = await fetchRowsForRange(startDate, endDate)
  const totalAppointments = rows.reduce((sum, row) => sum + Number(row.appointment_count ?? 0), 0)
  const uniqueClinicians = new Set(rows.map((r) => r.clinician_id).filter(Boolean))
  const uniqueLogs = new Set(rows.map((r) => r.log_id).filter(Boolean))
  const uniqueDays = new Set(rows.map((r) => r.log_date).filter(Boolean))

  const totalHours = Array.from(hoursByUniqueLog(rows).values()).reduce((sum, h) => sum + h, 0)
  const workingDays = Math.max(uniqueDays.size, 1)

  return {
    totalAppointments,
    totalHours: Math.round(totalHours * 10) / 10,
    activeClinicians: uniqueClinicians.size,
    totalLogs: uniqueLogs.size,
    avgAppointmentsPerDay: Math.round((totalAppointments / workingDays) * 10) / 10,
  }
}

export async function getAppointmentsByCategory(
  startDate: string,
  endDate: string,
): Promise<CategoryBreakdownItem[]> {
  const rows = await fetchRowsForRange(startDate, endDate)
  const totals = new Map<string, number>()
  let grandTotal = 0

  for (const row of rows) {
    const name = (row.category_name ?? 'Uncategorised').trim() || 'Uncategorised'
    const count = Number(row.appointment_count ?? 0)
    totals.set(name, (totals.get(name) ?? 0) + count)
    grandTotal += count
  }

  return Array.from(totals.entries())
    .map(([category_name, total_count]) => ({
      category_name,
      total_count,
      percentage: grandTotal > 0 ? Math.round((total_count / grandTotal) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.total_count - a.total_count)
}

export async function getAppointmentsByPractice(
  startDate: string,
  endDate: string,
): Promise<PracticeBreakdownItem[]> {
  const rows = await fetchRowsForRange(startDate, endDate)
  const map = new Map<string, { total_count: number; logIds: Set<string>; hoursByLog: Map<string, number> }>()

  for (const row of rows) {
    const practiceName = (row.practice_name ?? 'Unknown practice').trim() || 'Unknown practice'
    const current = map.get(practiceName) ?? {
      total_count: 0,
      logIds: new Set<string>(),
      hoursByLog: new Map<string, number>(),
    }
    current.total_count += Number(row.appointment_count ?? 0)
    if (row.log_id) {
      current.logIds.add(row.log_id)
      if (!current.hoursByLog.has(row.log_id)) {
        current.hoursByLog.set(row.log_id, Number(row.hours_worked ?? 0))
      }
    }
    map.set(practiceName, current)
  }

  return Array.from(map.entries())
    .map(([practice_name, value]) => ({
      practice_name,
      total_count: value.total_count,
      total_hours: Math.round(Array.from(value.hoursByLog.values()).reduce((s, h) => s + h, 0) * 10) / 10,
      log_count: value.logIds.size,
    }))
    .sort((a, b) => b.total_count - a.total_count)
}

export async function getDailyTrend(startDate: string, endDate: string): Promise<DailyTrendItem[]> {
  const rows = await fetchRowsForRange(startDate, endDate)
  const map = new Map<string, { total_appointments: number; hoursByLog: Map<string, number> }>()

  for (const row of rows) {
    const date = row.log_date?.slice(0, 10)
    if (!date) continue
    const current = map.get(date) ?? {
      total_appointments: 0,
      hoursByLog: new Map<string, number>(),
    }
    current.total_appointments += Number(row.appointment_count ?? 0)
    if (row.log_id && !current.hoursByLog.has(row.log_id)) {
      current.hoursByLog.set(row.log_id, Number(row.hours_worked ?? 0))
    }
    map.set(date, current)
  }

  return Array.from(map.entries())
    .map(([date, value]) => ({
      date,
      total_appointments: value.total_appointments,
      total_hours: Math.round(Array.from(value.hoursByLog.values()).reduce((s, h) => s + h, 0) * 10) / 10,
    }))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
}

export async function getClinicianBreakdown(
  startDate: string,
  endDate: string,
): Promise<ClinicianBreakdownItem[]> {
  const rows = await fetchRowsForRange(startDate, endDate)
  const map = new Map<
    string,
    { total_appointments: number; practices: Set<string>; logs: Set<string>; hoursByLog: Map<string, number> }
  >()

  for (const row of rows) {
    const clinician = (row.clinician_name ?? 'Unknown clinician').trim() || 'Unknown clinician'
    const current = map.get(clinician) ?? {
      total_appointments: 0,
      practices: new Set<string>(),
      logs: new Set<string>(),
      hoursByLog: new Map<string, number>(),
    }

    current.total_appointments += Number(row.appointment_count ?? 0)
    if (row.practice_name) current.practices.add(row.practice_name)
    if (row.log_id) {
      current.logs.add(row.log_id)
      if (!current.hoursByLog.has(row.log_id)) {
        current.hoursByLog.set(row.log_id, Number(row.hours_worked ?? 0))
      }
    }
    map.set(clinician, current)
  }

  return Array.from(map.entries())
    .map(([clinician_name, value]) => ({
      clinician_name,
      total_appointments: value.total_appointments,
      total_hours: Math.round(Array.from(value.hoursByLog.values()).reduce((s, h) => s + h, 0) * 10) / 10,
      practices_covered: value.practices.size,
      log_count: value.logs.size,
    }))
    .sort((a, b) => b.total_appointments - a.total_appointments)
}

export async function getRecentLogs(limit: number): Promise<RecentLogItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('activity_report')
    .select(
      'log_id, log_date, hours_worked, clinician_name, practice_name, category_name, appointment_count, submitted_at',
    )
    .order('submitted_at', { ascending: false })
    .limit(Math.max(limit * 8, 30))

  if (error) {
    console.error('[reporting.getRecentLogs]', error.message)
    return []
  }

  const grouped = new Map<string, RecentLogItem>()

  for (const row of (data ?? []) as ActivityReportRow[]) {
    if (!row.log_id) continue
    if (!grouped.has(row.log_id)) {
      grouped.set(row.log_id, {
        clinician_name: (row.clinician_name ?? 'Unknown clinician').trim() || 'Unknown clinician',
        practice_name: (row.practice_name ?? 'Unknown practice').trim() || 'Unknown practice',
        log_date: row.log_date?.slice(0, 10) ?? '',
        hours_worked: Number(row.hours_worked ?? 0),
        categories: [],
      })
    }
    const g = grouped.get(row.log_id)
    if (!g) continue
    g.categories.push({
      name: (row.category_name ?? 'Uncategorised').trim() || 'Uncategorised',
      count: Number(row.appointment_count ?? 0),
    })
    if (!g.log_date && row.log_date) {
      g.log_date = row.log_date.slice(0, 10)
    }
  }

  return Array.from(grouped.values()).slice(0, limit)
}
