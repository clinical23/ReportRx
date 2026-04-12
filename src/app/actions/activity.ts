'use server'

import { revalidatePath } from 'next/cache'

import { todayISOInLondon } from '@/lib/datetime'
import { getProfile } from '@/lib/supabase/auth'
import { getAssignedPracticeIdsForProfileWithClient } from '@/lib/supabase/clinician-practice-assignments'
import { createClient } from '@/lib/supabase/server'

export type CategoryEntry = {
  category_id: string
  count: number
}

export type SaveActivityLogInput = {
  practice_id: string
  log_date: string
  hours_worked: number | null
  notes?: string
  entries: CategoryEntry[]
}

export type SaveActivityLogResult =
  | { success: true; log_id: string }
  | { success: false; error: string }

export type PreviousDayLogResult =
  | {
      success: true
      log_date: string
      hours_worked: number | null
      entries: { category_id: string; count: number }[]
    }
  | { success: false; error: string }

const MANAGER_ROLES = new Set([
  'manager',
  'practice_manager',
  'pcn_manager',
  'admin',
  'superadmin',
])

export async function saveActivityLog(input: SaveActivityLogInput): Promise<SaveActivityLogResult> {
  const profile = await getProfile()
  const supabase = await createClient()
  const nonZeroEntries = input.entries.filter((e) => e.count > 0)
  if (nonZeroEntries.length === 0) {
    return { success: false, error: 'Please enter at least one appointment count.' }
  }

  // Verify practice belongs to user's organisation
  const { data: practice } = await supabase
    .from('practices')
    .select('id')
    .eq('id', input.practice_id)
    .eq('organisation_id', profile.organisation_id)
    .maybeSingle()
  if (!practice) {
    return { success: false, error: 'Invalid practice.' }
  }

  if (profile.role === 'clinician') {
    const assigned = await getAssignedPracticeIdsForProfileWithClient(
      supabase,
      profile.id,
      profile.organisation_id,
    )
    if (
      assigned.length > 0 &&
      !assigned.includes(String(input.practice_id))
    ) {
      return { success: false, error: 'You are not assigned to this practice.' }
    }
  }

  // Verify all categories belong to user's organisation
  if (nonZeroEntries.length > 0) {
    const { data: validCats } = await supabase
      .from('activity_categories')
      .select('id')
      .eq('organisation_id', profile.organisation_id)
      .in('id', nonZeroEntries.map((e) => e.category_id))
    if (!validCats || validCats.length !== nonZeroEntries.length) {
      return { success: false, error: 'Invalid category.' }
    }
  }

  const { data: logData, error: logError } = await supabase
    .from('activity_logs')
    .upsert(
      {
        clinician_id: profile.id,
        practice_id: input.practice_id,
        log_date: input.log_date,
        hours_worked: input.hours_worked,
        notes: input.notes ?? null,
        organisation_id: profile.organisation_id,
        submitted_by: profile.id,
      },
      { onConflict: 'clinician_id,practice_id,log_date' }
    )
    .select('id')
    .single()
  if (logError || !logData) {
    console.error('[saveActivityLog] log upsert failed:', logError?.message)
    return { success: false, error: 'Failed to save log. Please try again.' }
  }
  const log_id = logData.id
  const { error: deleteError } = await supabase
    .from('activity_log_entries')
    .delete()
    .eq('log_id', log_id)
  if (deleteError) {
    return { success: false, error: 'Failed to update entries. Please try again.' }
  }
  const { error: insertError } = await supabase
    .from('activity_log_entries')
    .insert(
      nonZeroEntries.map((e) => ({
        log_id,
        category_id: e.category_id,
        count: e.count,
      }))
    )
  if (insertError) {
    return { success: false, error: 'Failed to save entries. Please try again.' }
  }
  revalidatePath('/activity')
  revalidatePath('/')
  revalidatePath('/reporting')
  return { success: true, log_id }
}

export async function getPreviousDayLog(
  practiceId: string,
): Promise<PreviousDayLogResult> {
  const profile = await getProfile()
  const supabase = await createClient()
  const practice = practiceId.trim()
  if (!practice) {
    return { success: false, error: 'Please select a practice first.' }
  }

  if (profile.role === 'clinician') {
    const assigned = await getAssignedPracticeIdsForProfileWithClient(
      supabase,
      profile.id,
      profile.organisation_id,
    )
    if (assigned.length > 0 && !assigned.includes(practice)) {
      return { success: false, error: 'You are not assigned to this practice.' }
    }
  }

  const todayIso = todayISOInLondon()

  const { data: priorLog, error: logError } = await supabase
    .from('activity_logs')
    .select('id, log_date, hours_worked')
    .eq('clinician_id', profile.id)
    .eq('practice_id', practice)
    .lt('log_date', todayIso)
    .order('log_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (logError) {
    return { success: false, error: 'Could not load previous entry.' }
  }
  if (!priorLog) {
    return { success: false, error: 'No previous entry found for this practice.' }
  }

  const { data: entries, error: entriesError } = await supabase
    .from('activity_log_entries')
    .select('category_id, count')
    .eq('log_id', priorLog.id)

  if (entriesError) {
    return { success: false, error: 'Could not load previous entry categories.' }
  }

  return {
    success: true,
    log_date: String(priorLog.log_date).slice(0, 10),
    hours_worked:
      priorLog.hours_worked == null ? null : Number(priorLog.hours_worked),
    entries: (entries ?? []).map((e) => ({
      category_id: String(e.category_id),
      count: Number(e.count ?? 0),
    })),
  }
}

export type EditActivityLogInput = {
  log_id: string
  hours_worked: number | null
  entries: CategoryEntry[]
  reason?: string
}

export async function editActivityLog(
  input: EditActivityLogInput,
): Promise<SaveActivityLogResult> {
  const profile = await getProfile()
  const supabase = await createClient()
  const logId = input.log_id.trim()
  if (!logId) return { success: false, error: 'Missing log id.' }

  const nonZeroEntries = input.entries.filter((e) => e.count > 0)
  if (nonZeroEntries.length === 0) {
    return { success: false, error: 'Please enter at least one appointment count.' }
  }

  const { data: logRow, error: logError } = await supabase
    .from('activity_logs')
    .select('id, submitted_by, organisation_id, hours_worked')
    .eq('id', logId)
    .single()

  if (logError || !logRow) {
    return { success: false, error: 'Activity log not found.' }
  }
  if (logRow.organisation_id !== profile.organisation_id) {
    return { success: false, error: 'Unauthorized.' }
  }

  const canManage = MANAGER_ROLES.has(profile.role)
  const canEdit = logRow.submitted_by === profile.id || canManage
  if (!canEdit) {
    return { success: false, error: 'You can only edit your own logs.' }
  }

  const categoryIds = nonZeroEntries.map((e) => e.category_id)
  const { data: validCats } = await supabase
    .from('activity_categories')
    .select('id, name')
    .eq('organisation_id', profile.organisation_id)
    .in('id', categoryIds)
  if (!validCats || validCats.length !== categoryIds.length) {
    return { success: false, error: 'Invalid category.' }
  }

  const { data: oldEntries, error: oldEntriesError } = await supabase
    .from('activity_log_entries')
    .select('category_id, count')
    .eq('log_id', logId)
  if (oldEntriesError) {
    return { success: false, error: 'Failed to load existing entries.' }
  }

  const oldByCategory = new Map<string, number>()
  for (const row of oldEntries ?? []) {
    oldByCategory.set(String(row.category_id), Number(row.count ?? 0))
  }
  const newByCategory = new Map<string, number>()
  for (const row of nonZeroEntries) {
    newByCategory.set(String(row.category_id), Number(row.count ?? 0))
  }

  const changedCategoryIds = new Set<string>()
  for (const id of oldByCategory.keys()) changedCategoryIds.add(id)
  for (const id of newByCategory.keys()) changedCategoryIds.add(id)

  const categoryNameById = new Map<string, string>()
  for (const c of validCats) categoryNameById.set(String(c.id), String(c.name))
  if (changedCategoryIds.size > categoryNameById.size) {
    const missing = [...changedCategoryIds].filter((id) => !categoryNameById.has(id))
    if (missing.length > 0) {
      const { data: extraCats } = await supabase
        .from('activity_categories')
        .select('id, name')
        .in('id', missing)
      for (const c of extraCats ?? []) {
        categoryNameById.set(String(c.id), String(c.name))
      }
    }
  }

  const oldHours = logRow.hours_worked == null ? null : Number(logRow.hours_worked)
  const newHours = input.hours_worked == null ? null : Number(input.hours_worked)
  const reason = input.reason?.trim() ? input.reason.trim() : null
  const auditRows: Array<{
    activity_log_id: string
    edited_by: string
    field_name: string
    old_value: string | null
    new_value: string | null
    reason: string | null
  }> = []

  if (oldHours !== newHours) {
    auditRows.push({
      activity_log_id: logId,
      edited_by: profile.id,
      field_name: 'hours_worked',
      old_value: oldHours == null ? null : String(oldHours),
      new_value: newHours == null ? null : String(newHours),
      reason,
    })
  }

  for (const categoryId of changedCategoryIds) {
    const oldCount = oldByCategory.get(categoryId) ?? 0
    const newCount = newByCategory.get(categoryId) ?? 0
    if (oldCount === newCount) continue
    const categoryLabel = categoryNameById.get(categoryId) ?? categoryId
    auditRows.push({
      activity_log_id: logId,
      edited_by: profile.id,
      field_name: `category:${categoryLabel}`,
      old_value: String(oldCount),
      new_value: String(newCount),
      reason,
    })
  }

  const { error: updateError } = await supabase
    .from('activity_logs')
    .update({ hours_worked: newHours })
    .eq('id', logId)
  if (updateError) {
    return { success: false, error: 'Failed to update log.' }
  }

  const { error: deleteError } = await supabase
    .from('activity_log_entries')
    .delete()
    .eq('log_id', logId)
  if (deleteError) {
    return { success: false, error: 'Failed to update entries.' }
  }

  const { error: insertEntriesError } = await supabase
    .from('activity_log_entries')
    .insert(
      nonZeroEntries.map((e) => ({
        log_id: logId,
        category_id: e.category_id,
        count: e.count,
      })),
    )
  if (insertEntriesError) {
    return { success: false, error: 'Failed to save entries.' }
  }

  if (auditRows.length > 0) {
    const { error: auditError } = await supabase
      .from('activity_log_edits')
      .insert(auditRows)
    if (auditError) {
      console.error('[editActivityLog] audit insert failed:', auditError.message)
      return { success: false, error: 'Saved changes but failed to write audit trail.' }
    }
  }

  revalidatePath('/activity')
  revalidatePath('/activity/day')
  revalidatePath('/')
  revalidatePath('/reporting')
  return { success: true, log_id: logId }
}

export type BulkSaveInput = {
  clinician_ids: string[]
  practice_id: string
  log_date: string
  hours_worked: number | null
  entries: CategoryEntry[]
}

export async function bulkSaveActivityLogs(
  input: BulkSaveInput,
): Promise<{ success: true; count: number } | { success: false; error: string }> {
  const profile = await getProfile()
  if (profile.role === 'clinician') {
    return { success: false, error: 'Unauthorized' }
  }

  if (input.clinician_ids.length === 0) {
    return { success: false, error: 'Select at least one clinician.' }
  }

  const supabase = await createClient()
  const nonZeroEntries = input.entries.filter((e) => e.count > 0)
  if (nonZeroEntries.length === 0) {
    return { success: false, error: 'Please enter at least one appointment count.' }
  }

  // Verify practice belongs to user's organisation
  const { data: practice } = await supabase
    .from('practices')
    .select('id')
    .eq('id', input.practice_id)
    .eq('organisation_id', profile.organisation_id)
    .maybeSingle()
  if (!practice) {
    return { success: false, error: 'Invalid practice.' }
  }

  // Verify all clinician_ids belong to user's organisation via clinician_practices
  const { data: validClinicians } = await supabase
    .from('clinician_practices')
    .select('clinician_id')
    .in('clinician_id', input.clinician_ids)
    .eq('practice_id', input.practice_id)
  const validClinicianIds = new Set((validClinicians ?? []).map((c) => c.clinician_id))
  const invalidIds = input.clinician_ids.filter((id) => !validClinicianIds.has(id))
  if (invalidIds.length > 0) {
    return { success: false, error: 'One or more clinicians are not valid for this practice.' }
  }

  const clinicianIds = [...new Set(input.clinician_ids)]
  const rowsToUpsert = clinicianIds.map((clinician_id) => ({
    clinician_id,
    practice_id: input.practice_id,
    log_date: input.log_date,
    hours_worked: input.hours_worked,
    organisation_id: profile.organisation_id,
    submitted_by: profile.id,
  }))

  const { data: upsertedLogs, error: upsertError } = await supabase
    .from('activity_logs')
    .upsert(rowsToUpsert, { onConflict: 'clinician_id,practice_id,log_date' })
    .select('id, clinician_id')

  if (upsertError) {
    return { success: false, error: 'Failed to save logs.' }
  }
  if (!upsertedLogs || upsertedLogs.length !== clinicianIds.length) {
    return { success: false, error: 'Failed to save one or more logs.' }
  }

  const logIdByClinician = new Map(
    upsertedLogs.map((r) => [String(r.clinician_id), String(r.id)]),
  )
  const logIds = upsertedLogs.map((r) => String(r.id))

  const { error: deleteError } = await supabase
    .from('activity_log_entries')
    .delete()
    .in('log_id', logIds)
  if (deleteError) {
    return { success: false, error: 'Failed to clear previous entries for one or more logs.' }
  }

  const allEntries = clinicianIds.flatMap((clinician_id) => {
    const logId = logIdByClinician.get(clinician_id)
    if (!logId) return []
    return nonZeroEntries.map((e) => ({
      log_id: logId,
      category_id: e.category_id,
      count: e.count,
    }))
  })

  if (allEntries.length > 0) {
    const { error: insertError } = await supabase.from('activity_log_entries').insert(allEntries)
    if (insertError) {
      return { success: false, error: 'Failed to save entries for one or more logs.' }
    }
  }

  revalidatePath('/activity')
  revalidatePath('/activity/day')
  revalidatePath('/')
  revalidatePath('/reporting')
  return { success: true, count: clinicianIds.length }
}

export async function addActivityCategory(
  name: string,
): Promise<{ success: boolean; error?: string }> {
  const profile = await getProfile()
  if (profile.role === 'clinician') {
    return { success: false, error: 'Unauthorized' }
  }

  const trimmed = name.trim()
  if (!trimmed) return { success: false, error: 'Category name cannot be empty.' }
  const supabase = await createClient()
  const { error } = await supabase
    .from('activity_categories')
    .insert({ name: trimmed, organisation_id: profile.organisation_id })
  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'That category already exists.' }
    }
    return { success: false, error: 'Failed to add category.' }
  }
  revalidatePath('/activity')
  revalidatePath('/reporting')
  return { success: true }
}
