import { createClient } from '@/lib/supabase/server'

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
