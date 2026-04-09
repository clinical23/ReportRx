'use server'

import { revalidatePath } from 'next/cache'

import { getProfile } from '@/lib/supabase/auth'
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

export async function saveActivityLog(input: SaveActivityLogInput): Promise<SaveActivityLogResult> {
  const profile = await getProfile()
  const supabase = await createClient()
  const nonZeroEntries = input.entries.filter((e) => e.count > 0)
  if (nonZeroEntries.length === 0) {
    return { success: false, error: 'Please enter at least one appointment count.' }
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

  for (const clinician_id of input.clinician_ids) {
    const { data: logData, error: logError } = await supabase
      .from('activity_logs')
      .upsert(
        {
          clinician_id,
          practice_id: input.practice_id,
          log_date: input.log_date,
          hours_worked: input.hours_worked,
          organisation_id: profile.organisation_id,
          submitted_by: profile.id,
        },
        { onConflict: 'clinician_id,practice_id,log_date' }
      )
      .select('id')
      .single()

    if (logError || !logData) {
      return { success: false, error: 'Failed to save one or more logs.' }
    }

    const { error: deleteError } = await supabase
      .from('activity_log_entries')
      .delete()
      .eq('log_id', logData.id)
    if (deleteError) {
      return { success: false, error: 'Failed to update entries for one or more logs.' }
    }

    const { error: insertError } = await supabase
      .from('activity_log_entries')
      .insert(
        nonZeroEntries.map((e) => ({
          log_id: logData.id,
          category_id: e.category_id,
          count: e.count,
        }))
      )
    if (insertError) {
      return { success: false, error: 'Failed to save entries for one or more logs.' }
    }
  }

  revalidatePath('/activity')
  revalidatePath('/')
  revalidatePath('/reporting')
  return { success: true, count: input.clinician_ids.length }
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
