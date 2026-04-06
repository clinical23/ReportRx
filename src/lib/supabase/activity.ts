import { isIsoDateInLondonMonth } from '@/lib/datetime'
import { createClient } from '@/lib/supabase/server'

export type Practice = {
  id: string
  name: string
  pcn_name: string | null
}

export type ActivityCategory = {
  id: string
  name: string
  sort_order: number
}

export type ActivityLogEntry = {
  category_id: string
  count: number
}

export type RecentLogRow = {
  log_id: string
  log_date: string
  hours_worked: number | null
  clinician_name: string
  practice_name: string
  category_name: string
  appointment_count: number
}

export async function listPractices(): Promise<Practice[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('practices')
    .select('id, name, pcn_name')
    .order('name')
  if (error) { console.error('[listPractices]', error.message); return [] }
  return data ?? []
}

export async function listActivityCategories(): Promise<ActivityCategory[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('activity_categories')
    .select('id, name, sort_order')
    .eq('is_active', true)
    .order('sort_order')
  if (error) { console.error('[listActivityCategories]', error.message); return [] }
  return data ?? []
}

export async function listRecentLogs(limit = 20): Promise<RecentLogRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('activity_report')
    .select('*')
    .limit(limit)
  if (error) { console.error('[listRecentLogs]', error.message); return [] }
  const rows = data ?? []
  return rows.map((row: Record<string, unknown>) => ({
    log_id: String(row.log_id ?? ''),
    log_date: String(row.log_date ?? ''),
    hours_worked:
      row.hours_worked == null ? null : Number(row.hours_worked),
    clinician_name: String(row.clinician_name ?? ''),
    practice_name: String(row.practice_name ?? ''),
    category_name: String(row.category_name ?? ''),
    appointment_count: Number(row.appointment_count ?? 0),
  }))
}

export async function listRecentLogsGrouped(limit = 10) {
  const rows = await listRecentLogs(limit * 8)
  const map = new Map<string, {
    log_id: string
    log_date: string
    hours_worked: number | null
    clinician_name: string
    practice_name: string
    entries: { category_name: string; count: number }[]
  }>()
  for (const row of rows) {
    if (!row.log_id) continue
    if (!map.has(row.log_id)) {
      map.set(row.log_id, {
        log_id: row.log_id,
        log_date: row.log_date,
        hours_worked: row.hours_worked,
        clinician_name: row.clinician_name,
        practice_name: row.practice_name,
        entries: [],
      })
    }
    const group = map.get(row.log_id)
    if (group) {
      group.entries.push({
        category_name: row.category_name,
        count: row.appointment_count,
      })
    }
  }
  return Array.from(map.values()).slice(0, limit)
}

export type DashboardActivityStats = {
  appointmentsThisMonth: number
  hoursThisMonth: number
  /** Distinct clinician names with activity in the London calendar month */
  activeCliniciansThisMonth: number
}

/**
 * Aggregates activity_report for the current calendar month (Europe/London).
 */
export async function getDashboardActivityStats(): Promise<DashboardActivityStats> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('activity_report')
    .select('log_id, log_date, hours_worked, appointment_count, clinician_name')

  if (error) {
    console.error('[getDashboardActivityStats]', error.message)
    return {
      appointmentsThisMonth: 0,
      hoursThisMonth: 0,
      activeCliniciansThisMonth: 0,
    }
  }

  const rows = data ?? []
  const inMonth = rows.filter((r: { log_date?: string }) =>
    r.log_date && isIsoDateInLondonMonth(String(r.log_date)),
  )

  let appointmentsThisMonth = 0
  const hoursByLog = new Map<string, number>()
  const clinicianNames = new Set<string>()

  for (const r of inMonth) {
    const row = r as {
      log_id: string
      log_date: string
      hours_worked: number | null
      appointment_count: number | null
      clinician_name?: string | null
    }
    appointmentsThisMonth += Number(row.appointment_count ?? 0)
    const name = String(row.clinician_name ?? '').trim()
    if (name) clinicianNames.add(name)
    if (row.log_id) {
      const h = row.hours_worked == null ? 0 : Number(row.hours_worked)
      hoursByLog.set(row.log_id, h)
    }
  }

  let hoursThisMonth = 0
  for (const h of hoursByLog.values()) {
    hoursThisMonth += h
  }

  return {
    appointmentsThisMonth,
    hoursThisMonth: Math.round(hoursThisMonth * 10) / 10,
    activeCliniciansThisMonth: clinicianNames.size,
  }
}
