import { getProfile } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/server'
import {
  buildExpectedDateSet,
  normalizeWorkingDays,
} from '@/lib/working-pattern'

/** null = no practice filter; [] = impossible scope (no matching practices). */
export type ReportingPracticeScope = string[] | null

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type ReportingPcnOption = { id: string; name: string }
export type ReportingPracticeOption = {
  id: string
  name: string
  pcn_id: string | null
}

export async function listReportingPcns(
  organisationId: string,
): Promise<ReportingPcnOption[]> {
  await getProfile()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pcns')
    .select('id, name')
    .eq('organisation_id', organisationId)
    .or('is_active.is.null,is_active.eq.true')
    .order('name', { ascending: true })
  if (error) {
    console.error('[listReportingPcns]', error.message)
    return []
  }
  return (data ?? []) as ReportingPcnOption[]
}

export async function listReportingPractices(
  organisationId: string,
): Promise<ReportingPracticeOption[]> {
  await getProfile()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('practices')
    .select('id, name, pcn_id')
    .eq('organisation_id', organisationId)
    .or('is_active.is.null,is_active.eq.true')
    .order('name', { ascending: true })
  if (error) {
    console.error('[listReportingPractices]', error.message)
    return []
  }
  return (data ?? []) as ReportingPracticeOption[]
}

/**
 * Resolve URL filter params to a list of practice IDs for activity_report queries.
 * - Single practice: [id]
 * - PCN: all practice IDs in that PCN (may be [])
 * - Neither / invalid: null (no filter)
 */
export function resolveReportingPracticeScope(
  practices: ReportingPracticeOption[],
  pcnId: string | null | undefined,
  practiceId: string | null | undefined,
): ReportingPracticeScope {
  const pParam = practiceId?.trim() ?? ''
  if (pParam && UUID_RE.test(pParam)) {
    const exists = practices.some((p) => p.id === pParam)
    return exists ? [pParam] : null
  }
  const cParam = pcnId?.trim() ?? ''
  if (cParam && UUID_RE.test(cParam)) {
    const inPcn = practices.filter((p) => p.pcn_id === cParam).map((p) => p.id)
    return inPcn
  }
  return null
}

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
  practice_id?: string | null
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

/**
 * Per-clinician completeness: expected days = working pattern + approved additional days
 * in range (de-duplicated); logged days = distinct dates with activity on expected days only.
 */
async function fetchDataCompletenessForOrganisation(
  organisationId: string,
  rows: ActivityReportRow[],
  startDate: string,
  endDate: string,
  clinicianScope: ReportingClinicianScope,
): Promise<DataCompletenessRow[]> {
  const supabase = await createClient()
  const start = startDate.slice(0, 10)
  const end = endDate.slice(0, 10)

  const { data: profData } = await supabase
    .from('profiles')
    .select('id, full_name, working_days')
    .eq('organisation_id', organisationId)
    .eq('role', 'clinician')

  let clinicians = (profData ?? []) as Array<{
    id: string
    full_name: string | null
    working_days: unknown
  }>

  if (clinicianScope != null && clinicianScope.length > 0) {
    const allow = new Set(clinicianScope)
    clinicians = clinicians.filter((p) => allow.has(p.id))
  }

  const { data: addl } = await supabase
    .from('additional_working_days')
    .select('clinician_id, work_date')
    .eq('organisation_id', organisationId)
    .gte('work_date', start)
    .lte('work_date', end)

  const additionalByClinician = new Map<string, Set<string>>()
  for (const r of addl ?? []) {
    const cid = String(r.clinician_id)
    const wd = String(r.work_date).slice(0, 10)
    if (!additionalByClinician.has(cid)) additionalByClinician.set(cid, new Set())
    additionalByClinician.get(cid)!.add(wd)
  }

  const expectedById = new Map<string, Set<string>>()
  const nameById = new Map<string, string>()
  for (const c of clinicians) {
    const wn = normalizeWorkingDays(c.working_days)
    const extra = additionalByClinician.get(c.id) ?? new Set<string>()
    const exp = buildExpectedDateSet(wn, extra, start, end)
    expectedById.set(c.id, exp)
    nameById.set(c.id, c.full_name?.trim() || 'Unknown user')
  }

  const loggedInExpected = new Map<string, Set<string>>()
  for (const row of rows) {
    const cid = String(row.clinician_id ?? '').trim()
    if (!cid) continue
    const exp = expectedById.get(cid)
    if (!exp) continue
    const d = String(row.log_date ?? '').slice(0, 10)
    if (!d || d < start || d > end) continue
    if (!exp.has(d)) continue
    if (!loggedInExpected.has(cid)) loggedInExpected.set(cid, new Set())
    loggedInExpected.get(cid)!.add(d)
  }

  const outputRows: DataCompletenessRow[] = []
  for (const c of clinicians) {
    const exp = expectedById.get(c.id)!
    if (exp.size === 0) continue
    const logged = loggedInExpected.get(c.id) ?? new Set()
    const logged_days = logged.size
    const expected_days = exp.size
    const missing_days = Math.max(0, expected_days - logged_days)
    const completeness_pct =
      expected_days > 0
        ? Math.round((logged_days / expected_days) * 1000) / 10
        : 100
    outputRows.push({
      clinician_name: nameById.get(c.id)!,
      expected_days,
      logged_days,
      missing_days,
      completeness_pct,
    })
  }

  return outputRows.sort(
    (a, b) =>
      a.completeness_pct - b.completeness_pct ||
      a.clinician_name.localeCompare(b.clinician_name),
  )
}

export async function getDataCompleteness(
  startDate: string,
  endDate: string,
  practiceScope?: ReportingPracticeScope,
  clinicianKeys?: ReportingClinicianScope,
): Promise<DataCompletenessRow[]> {
  const profile = await getProfile()
  const rows = await fetchRowsForRange(startDate, endDate, practiceScope, clinicianKeys)
  return fetchDataCompletenessForOrganisation(
    profile.organisation_id,
    rows,
    startDate,
    endDate,
    clinicianKeys ?? null,
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
      'log_id, log_date, hours_worked, clinician_id, clinician_name, practice_name, category_name, appointment_count, practice_id',
    )
    .order('log_date', { ascending: false })
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

const REPORT_SELECT =
  'log_id, log_date, hours_worked, clinician_id, clinician_name, practice_name, category_name, appointment_count, practice_id'

/** When non-empty, restrict rows to these activity_report.clinician_id values. */
export type ReportingClinicianScope = string[] | null

async function fetchRowsForRange(
  startDate: string,
  endDate: string,
  practiceScope?: ReportingPracticeScope,
  clinicianKeys?: ReportingClinicianScope,
): Promise<ActivityReportRow[]> {
  if (practiceScope !== null && practiceScope !== undefined && practiceScope.length === 0) {
    return []
  }
  if (clinicianKeys != null && clinicianKeys.length === 0) {
    return []
  }
  const supabase = await createClient()
  let q = supabase
    .from('activity_report')
    .select(REPORT_SELECT)
    .gte('log_date', startDate)
    .lte('log_date', endDate)

  if (practiceScope != null && practiceScope.length > 0) {
    q = q.in('practice_id', practiceScope)
  }

  if (clinicianKeys != null && clinicianKeys.length > 0) {
    q = q.in('clinician_id', clinicianKeys)
  }

  const { data, error } = await q

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

function reportingSummaryFromRows(rows: ActivityReportRow[]): ReportingSummary {
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

function appointmentsByCategoryFromRows(rows: ActivityReportRow[]): CategoryBreakdownItem[] {
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

function appointmentsByPracticeFromRows(rows: ActivityReportRow[]): PracticeBreakdownItem[] {
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

function dailyTrendFromRows(rows: ActivityReportRow[]): DailyTrendItem[] {
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

function clinicianBreakdownFromRows(rows: ActivityReportRow[]): ClinicianBreakdownItem[] {
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

function recentLogsFromRows(rows: ActivityReportRow[], limit: number): RecentLogItem[] {
  const sorted = [...rows].sort((a, b) =>
    String(b.log_date ?? '').localeCompare(String(a.log_date ?? '')),
  )
  const grouped = new Map<string, RecentLogItem>()

  for (const row of sorted) {
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

/**
 * One `activity_report` query for the reporting dashboard (replaces six identical range fetches).
 * There is no `monthly_summary` materialized view in this schema; aggregates are derived from
 * the `activity_report` view in memory after a single fetch.
 */
export async function loadReportingDashboardData(
  startDate: string,
  endDate: string,
  practiceScope?: ReportingPracticeScope,
  clinicianKeys?: ReportingClinicianScope,
): Promise<{
  summary: ReportingSummary
  byCategory: CategoryBreakdownItem[]
  byPractice: PracticeBreakdownItem[]
  dailyTrend: DailyTrendItem[]
  clinicianBreakdown: ClinicianBreakdownItem[]
  recentLogs: RecentLogItem[]
  dataCompleteness: DataCompletenessRow[]
}> {
  const profile = await getProfile()
  const rows = await fetchRowsForRange(startDate, endDate, practiceScope, clinicianKeys)
  const dataCompleteness = await fetchDataCompletenessForOrganisation(
    profile.organisation_id,
    rows,
    startDate,
    endDate,
    clinicianKeys ?? null,
  )
  return {
    summary: reportingSummaryFromRows(rows),
    byCategory: appointmentsByCategoryFromRows(rows),
    byPractice: appointmentsByPracticeFromRows(rows),
    dailyTrend: dailyTrendFromRows(rows),
    clinicianBreakdown: clinicianBreakdownFromRows(rows),
    recentLogs: recentLogsFromRows(rows, 10),
    dataCompleteness,
  }
}

export async function getReportingSummary(
  startDate: string,
  endDate: string,
  practiceScope?: ReportingPracticeScope,
  clinicianKeys?: ReportingClinicianScope,
): Promise<ReportingSummary> {
  const rows = await fetchRowsForRange(startDate, endDate, practiceScope, clinicianKeys)
  return reportingSummaryFromRows(rows)
}

export async function getAppointmentsByCategory(
  startDate: string,
  endDate: string,
  practiceScope?: ReportingPracticeScope,
  clinicianKeys?: ReportingClinicianScope,
): Promise<CategoryBreakdownItem[]> {
  const rows = await fetchRowsForRange(startDate, endDate, practiceScope, clinicianKeys)
  return appointmentsByCategoryFromRows(rows)
}

export async function getAppointmentsByPractice(
  startDate: string,
  endDate: string,
  practiceScope?: ReportingPracticeScope,
  clinicianKeys?: ReportingClinicianScope,
): Promise<PracticeBreakdownItem[]> {
  const rows = await fetchRowsForRange(startDate, endDate, practiceScope, clinicianKeys)
  return appointmentsByPracticeFromRows(rows)
}

export async function getDailyTrend(
  startDate: string,
  endDate: string,
  practiceScope?: ReportingPracticeScope,
  clinicianKeys?: ReportingClinicianScope,
): Promise<DailyTrendItem[]> {
  const rows = await fetchRowsForRange(startDate, endDate, practiceScope, clinicianKeys)
  return dailyTrendFromRows(rows)
}

export async function getClinicianBreakdown(
  startDate: string,
  endDate: string,
  practiceScope?: ReportingPracticeScope,
  clinicianKeys?: ReportingClinicianScope,
): Promise<ClinicianBreakdownItem[]> {
  const rows = await fetchRowsForRange(startDate, endDate, practiceScope, clinicianKeys)
  return clinicianBreakdownFromRows(rows)
}

export async function getRecentLogs(
  limit: number,
  options?: {
    practiceScope?: ReportingPracticeScope
    startDate?: string
    endDate?: string
    clinicianKeys?: ReportingClinicianScope
  },
): Promise<RecentLogItem[]> {
  const scope = options?.practiceScope
  if (scope !== null && scope !== undefined && scope.length === 0) {
    return []
  }
  const ck = options?.clinicianKeys
  if (ck != null && ck.length === 0) {
    return []
  }

  const supabase = await createClient()
  let q = supabase
    .from('activity_report')
    .select(REPORT_SELECT)
    .order('log_date', { ascending: false })
    .limit(Math.max(limit * 8, 80))

  if (options?.startDate && options?.endDate) {
    q = q.gte('log_date', options.startDate).lte('log_date', options.endDate)
  }
  if (scope != null && scope.length > 0) {
    q = q.in('practice_id', scope)
  }
  if (ck != null && ck.length > 0) {
    q = q.in('clinician_id', ck)
  }

  const { data, error } = await q

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
