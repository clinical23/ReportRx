import {
  isIsoDateInLondonMonth,
  isIsoDateInRange,
} from '@/lib/datetime'
import { getProfile } from '@/lib/supabase/auth'
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

type RecentLogRow = {
  log_id: string
  log_date: string
  hours_worked: number | null
  clinician_name: string
  practice_name: string
  category_name: string
  appointment_count: number
}

type ActivityLogEditRow = {
  id: string
  activity_log_id: string
  edited_by: string | null
  edited_at: string
  field_name: string
  old_value: string | null
  new_value: string | null
  reason: string | null
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
  const { organisation_id: organisationId } = await getProfile()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('activity_categories')
    .select('id, name, sort_order')
    .eq('is_active', true)
    .eq('organisation_id', organisationId)
    .order('sort_order')
  if (error) { console.error('[listActivityCategories]', error.message); return [] }
  return data ?? []
}

export type ActivityCategorySettingsRow = {
  id: string
  name: string
  sort_order: number
  is_active: boolean
}

/** All categories for the organisation (Settings UI), including archived. Admins only. */
export async function listActivityCategoriesForSettings(): Promise<
  ActivityCategorySettingsRow[]
> {
  const profile = await getProfile()
  if (profile.role !== 'admin' && profile.role !== 'superadmin') {
    return []
  }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('activity_categories')
    .select('id, name, sort_order, is_active')
    .eq('organisation_id', profile.organisation_id)
    .order('sort_order', { ascending: true })
  if (error) {
    console.error('[listActivityCategoriesForSettings]', error.message)
    return []
  }
  return (data ?? []) as ActivityCategorySettingsRow[]
}

export async function listRecentLogs(
  limit = 20,
  practiceScopeIds: string[],
): Promise<RecentLogRow[]> {
  if (practiceScopeIds.length === 0) {
    return []
  }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('activity_report')
    .select('*')
    .in('practice_id', practiceScopeIds)
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

export async function listRecentLogsGrouped(
  limit = 10,
  practiceScopeIds: string[],
) {
  if (practiceScopeIds.length === 0) return []

  const supabase = await createClient()
  const { data: logs, error: logsError } = await supabase
    .from('activity_logs')
    .select('id, log_date, hours_worked, clinician_id, practice_id, submitted_by, created_at')
    .in('practice_id', practiceScopeIds)
    .order('log_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)
  if (logsError) {
    console.error('[listRecentLogsGrouped.logs]', logsError.message)
    return []
  }

  const logIds = (logs ?? []).map((l) => String(l.id))
  if (logIds.length === 0) return []
  const practiceIds = [...new Set((logs ?? []).map((l) => String(l.practice_id)))]
  const clinicianIds = [...new Set((logs ?? []).map((l) => String(l.clinician_id)))]

  const [entriesRes, practicesRes, cliniciansRes, editsRes] = await Promise.all([
    supabase
      .from('activity_log_entries')
      .select('log_id, category_id, count')
      .in('log_id', logIds),
    supabase.from('practices').select('id, name').in('id', practiceIds),
    supabase.from('profiles').select('id, full_name').in('id', clinicianIds),
    supabase
      .from('activity_log_edits')
      .select('id, activity_log_id, edited_by, edited_at, field_name, old_value, new_value, reason')
      .in('activity_log_id', logIds)
      .order('edited_at', { ascending: false }),
  ])

  if (entriesRes.error) {
    console.error('[listRecentLogsGrouped.entries]', entriesRes.error.message)
    return []
  }

  const categoryIds = [...new Set((entriesRes.data ?? []).map((e) => String(e.category_id)))]
  const { data: categories } = categoryIds.length
    ? await supabase.from('activity_categories').select('id, name').in('id', categoryIds)
    : { data: [] as Array<{ id: string; name: string }> }

  const editRows = (editsRes.data ?? []) as ActivityLogEditRow[]
  const editUserIds = [...new Set(editRows.map((e) => e.edited_by).filter(Boolean) as string[])]
  const { data: editUsers } = editUserIds.length
    ? await supabase.from('profiles').select('id, full_name').in('id', editUserIds)
    : { data: [] as Array<{ id: string; full_name: string | null }> }

  const practiceNameById = new Map((practicesRes.data ?? []).map((p) => [String(p.id), String(p.name)]))
  const clinicianNameById = new Map(
    (cliniciansRes.data ?? []).map((p) => [String(p.id), String(p.full_name ?? 'Unknown clinician')]),
  )
  const categoryNameById = new Map((categories ?? []).map((c) => [String(c.id), String(c.name)]))
  const editorNameById = new Map(
    (editUsers ?? []).map((u) => [String(u.id), String(u.full_name ?? 'Unknown user')]),
  )

  const entriesByLogId = new Map<string, Array<{ category_name: string; count: number; category_id: string }>>()
  for (const row of entriesRes.data ?? []) {
    const logId = String(row.log_id)
    if (!entriesByLogId.has(logId)) entriesByLogId.set(logId, [])
    entriesByLogId.get(logId)!.push({
      category_id: String(row.category_id),
      category_name: categoryNameById.get(String(row.category_id)) ?? 'Uncategorised',
      count: Number(row.count ?? 0),
    })
  }

  const editsByLogId = new Map<
    string,
    Array<{
      id: string
      edited_at: string
      edited_by_name: string
      field_name: string
      old_value: string | null
      new_value: string | null
      reason: string | null
    }>
  >()
  for (const edit of editRows) {
    const logId = String(edit.activity_log_id)
    if (!editsByLogId.has(logId)) editsByLogId.set(logId, [])
    editsByLogId.get(logId)!.push({
      id: String(edit.id),
      edited_at: String(edit.edited_at),
      edited_by_name: edit.edited_by ? (editorNameById.get(String(edit.edited_by)) ?? 'Unknown user') : 'Unknown user',
      field_name: String(edit.field_name),
      old_value: edit.old_value ?? null,
      new_value: edit.new_value ?? null,
      reason: edit.reason ?? null,
    })
  }

  return (logs ?? []).map((log) => {
    const id = String(log.id)
    return {
      log_id: id,
      log_date: String(log.log_date),
      hours_worked: log.hours_worked == null ? null : Number(log.hours_worked),
      clinician_name: clinicianNameById.get(String(log.clinician_id)) ?? 'Unknown clinician',
      practice_name: practiceNameById.get(String(log.practice_id)) ?? 'Unknown practice',
      submitted_by: String(log.submitted_by ?? ''),
      entries: entriesByLogId.get(id) ?? [],
      edits: editsByLogId.get(id) ?? [],
      is_edited: (editsByLogId.get(id) ?? []).length > 0,
    }
  })
}

type DashboardActivityStats = {
  appointmentsThisMonth: number
  hoursThisMonth: number
  activeCliniciansThisMonth: number
}

export type DashboardRecentEntry = {
  log_id: string
  log_date: string
  clinician_name: string
  practice_name: string
  appointment_total: number
}

export type DashboardSnapshot = DashboardActivityStats & {
  topCategoryName: string | null
  topCategoryAppointments: number
  topPracticeName: string | null
  topPracticeAppointments: number
  entriesThisMonth: number
  recentEntries: DashboardRecentEntry[]
}

type ReportRow = {
  log_id: string
  log_date: string
  hours_worked: number | null
  appointment_count: number
  clinician_name: string
  practice_name: string
  category_name: string
}

function normalizeRows(data: unknown[]): ReportRow[] {
  return data.map((r) => {
    const row = r as Record<string, unknown>
    return {
      log_id: String(row.log_id ?? ''),
      log_date: String(row.log_date ?? '').slice(0, 10),
      hours_worked:
        row.hours_worked == null ? null : Number(row.hours_worked),
      appointment_count: Number(row.appointment_count ?? 0),
      clinician_name: String(row.clinician_name ?? ''),
      practice_name: String(row.practice_name ?? ''),
      category_name: String(row.category_name ?? ''),
    }
  })
}

/**
 * Full dashboard metrics + recent activity from activity_report (UK calendar month).
 * @param practiceScopeIds Practices the current user may aggregate (see getPracticeScopeIdsForSession).
 */
export async function getDashboardSnapshot(
  practiceScopeIds: string[],
): Promise<DashboardSnapshot> {
  const empty: DashboardSnapshot = {
    appointmentsThisMonth: 0,
    hoursThisMonth: 0,
    activeCliniciansThisMonth: 0,
    topCategoryName: null,
    topCategoryAppointments: 0,
    topPracticeName: null,
    topPracticeAppointments: 0,
    entriesThisMonth: 0,
    recentEntries: [],
  }

  if (practiceScopeIds.length === 0) {
    return empty
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('activity_report')
    .select('*')
    .in('practice_id', practiceScopeIds)

  if (error) {
    console.error('[getDashboardSnapshot]', error.message)
    return empty
  }

  const rows = normalizeRows(data ?? [])
  const inMonth = rows.filter(
    (r) => r.log_date && isIsoDateInLondonMonth(r.log_date),
  )

  const hoursByLog = new Map<string, number>()
  const clinicianNames = new Set<string>()
  const categoryTotals = new Map<string, number>()
  const practiceTotals = new Map<string, number>()
  const logIdsThisMonth = new Set<string>()

  let appointmentsThisMonth = 0

  for (const row of inMonth) {
    appointmentsThisMonth += row.appointment_count
    const cname = row.clinician_name.trim()
    if (cname) clinicianNames.add(cname)

    const cat = row.category_name.trim() || 'Uncategorised'
    categoryTotals.set(cat, (categoryTotals.get(cat) ?? 0) + row.appointment_count)

    const pn = row.practice_name.trim() || '—'
    practiceTotals.set(pn, (practiceTotals.get(pn) ?? 0) + row.appointment_count)

    if (row.log_id) {
      logIdsThisMonth.add(row.log_id)
      const h = row.hours_worked == null ? 0 : Number(row.hours_worked)
      hoursByLog.set(row.log_id, h)
    }
  }

  let topCategoryName: string | null = null
  let topCategoryAppointments = 0
  for (const [name, count] of categoryTotals) {
    if (count > topCategoryAppointments) {
      topCategoryAppointments = count
      topCategoryName = name
    }
  }

  let topPracticeName: string | null = null
  let topPracticeAppointments = 0
  for (const [name, count] of practiceTotals) {
    if (count > topPracticeAppointments) {
      topPracticeAppointments = count
      topPracticeName = name
    }
  }

  let hoursThisMonth = 0
  for (const h of hoursByLog.values()) {
    hoursThisMonth += h
  }

  const logAggregates = new Map<
    string,
    {
      log_date: string
      clinician_name: string
      practice_name: string
      appointment_total: number
    }
  >()

  for (const row of inMonth) {
    if (!row.log_id) continue
    const existing = logAggregates.get(row.log_id)
    if (!existing) {
      logAggregates.set(row.log_id, {
        log_date: row.log_date,
        clinician_name: row.clinician_name,
        practice_name: row.practice_name,
        appointment_total: row.appointment_count,
      })
    } else {
      existing.appointment_total += row.appointment_count
    }
  }

  const recentFixed: DashboardRecentEntry[] = [...logAggregates.entries()]
    .map(([log_id, v]) => ({
      log_id,
      log_date: v.log_date,
      clinician_name: v.clinician_name,
      practice_name: v.practice_name,
      appointment_total: v.appointment_total,
    }))
    .sort((a, b) => (a.log_date < b.log_date ? 1 : a.log_date > b.log_date ? -1 : 0))
    .slice(0, 5)

  return {
    appointmentsThisMonth,
    hoursThisMonth: Math.round(hoursThisMonth * 10) / 10,
    activeCliniciansThisMonth: clinicianNames.size,
    topCategoryName,
    topCategoryAppointments,
    topPracticeName,
    topPracticeAppointments,
    entriesThisMonth: logIdsThisMonth.size,
    recentEntries: recentFixed,
  }
}

/* ------------------------------------------------------------------ */
/*  Daily breakdown                                                    */
/* ------------------------------------------------------------------ */

export type DailyBreakdownEntry = {
  log_id: string;
  clinician_name: string;
  practice_name: string;
  category_name: string;
  appointment_count: number;
  hours_worked: number | null;
};

/**
 * All activity_report rows for a single date, scoped to visible practices.
 * For clinicians the caller can optionally pass clinicianId to restrict further.
 */
export async function getDailyBreakdown(
  date: string,
  practiceScopeIds: string[],
  clinicianId?: string | null,
): Promise<DailyBreakdownEntry[]> {
  if (practiceScopeIds.length === 0) return [];

  const supabase = await createClient();
  let query = supabase
    .from("activity_report")
    .select("*")
    .eq("log_date", date)
    .in("practice_id", practiceScopeIds);

  if (clinicianId) {
    query = query.eq("clinician_id", clinicianId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[getDailyBreakdown]", error.message);
    return [];
  }

  return (data ?? []).map((r: Record<string, unknown>) => ({
    log_id: String(r.log_id ?? ""),
    clinician_name: String(r.clinician_name ?? ""),
    practice_name: String(r.practice_name ?? ""),
    category_name: String(r.category_name ?? ""),
    appointment_count: Number(r.appointment_count ?? 0),
    hours_worked: r.hours_worked == null ? null : Number(r.hours_worked),
  }));
}

export type ReportingChartsData = {
  byCategory: { name: string; count: number }[]
  byClinician: { name: string; count: number }[]
  byPractice: { name: string; count: number }[]
}

export type ReportingTableRow = {
  clinician_name: string
  practice_name: string
  month_key: string
  appointments: number
  hours: number
}

export async function getReportingChartsData(
  from: string,
  to: string,
  practiceScopeIds: string[],
): Promise<ReportingChartsData> {
  if (practiceScopeIds.length === 0) {
    return { byCategory: [], byClinician: [], byPractice: [] }
  }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('activity_report')
    .select('*')
    .in('practice_id', practiceScopeIds)
  if (error) {
    console.error('[getReportingChartsData]', error.message)
    return { byCategory: [], byClinician: [], byPractice: [] }
  }
  const rows = normalizeRows(data ?? []).filter((r) =>
    isIsoDateInRange(r.log_date, from, to),
  )

  const catMap = new Map<string, number>()
  const clinMap = new Map<string, number>()
  const prMap = new Map<string, number>()

  for (const row of rows) {
    const cat = row.category_name.trim() || 'Uncategorised'
    catMap.set(cat, (catMap.get(cat) ?? 0) + row.appointment_count)
    const cn = row.clinician_name.trim() || '—'
    clinMap.set(cn, (clinMap.get(cn) ?? 0) + row.appointment_count)
    const pn = row.practice_name.trim() || '—'
    prMap.set(pn, (prMap.get(pn) ?? 0) + row.appointment_count)
  }

  const sortDesc = (m: Map<string, number>) =>
    [...m.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

  return {
    byCategory: sortDesc(catMap),
    byClinician: sortDesc(clinMap),
    byPractice: sortDesc(prMap),
  }
}

export async function getReportingTable(
  from: string,
  to: string,
  practiceScopeIds: string[],
): Promise<ReportingTableRow[]> {
  if (practiceScopeIds.length === 0) {
    return []
  }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('activity_report')
    .select('*')
    .in('practice_id', practiceScopeIds)
  if (error) {
    console.error('[getReportingTable]', error.message)
    return []
  }
  const rows = normalizeRows(data ?? []).filter((r) =>
    isIsoDateInRange(r.log_date, from, to),
  )

  type Acc = { appointments: number; hoursByLog: Map<string, number> }
  const groups = new Map<string, Acc>()

  for (const row of rows) {
    const monthKey = row.log_date.slice(0, 7)
    const key = `${row.clinician_name.trim()}|||${row.practice_name.trim()}|||${monthKey}`
    let g = groups.get(key)
    if (!g) {
      g = { appointments: 0, hoursByLog: new Map() }
      groups.set(key, g)
    }
    g.appointments += row.appointment_count
    if (row.log_id) {
      const h = row.hours_worked == null ? 0 : Number(row.hours_worked)
      g.hoursByLog.set(row.log_id, h)
    }
  }

  const out: ReportingTableRow[] = []
  for (const [key, g] of groups) {
    const [clinician_name, practice_name, month_key] = key.split("|||")
    let hours = 0
    for (const h of g.hoursByLog.values()) {
      hours += h
    }
    out.push({
      clinician_name: clinician_name ?? '—',
      practice_name: practice_name ?? '—',
      month_key: month_key ?? '',
      appointments: g.appointments,
      hours: Math.round(hours * 10) / 10,
    })
  }

  out.sort((a, b) => {
    const c = a.clinician_name.localeCompare(b.clinician_name)
    if (c !== 0) return c
    const p = a.practice_name.localeCompare(b.practice_name)
    if (p !== 0) return p
    return a.month_key.localeCompare(b.month_key)
  })

  return out
}
