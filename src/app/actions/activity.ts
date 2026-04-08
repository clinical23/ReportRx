'use server'

import { revalidatePath } from 'next/cache'

import { requireProfileSession } from '@/lib/supabase/action-session'
import { createClient } from '@/lib/supabase/server'
import { isAppRole } from '@/lib/supabase/auth-profile'

export type CategoryEntry = {
  category_id: string
  count: number
}

export type SaveActivityLogInput = {
  clinician_id: string
  practice_id: string
  log_date: string
  hours_worked: number | null
  notes?: string
  entries: CategoryEntry[]
}

export type SaveActivityLogResult =
  | { success: true; log_id: string }
  | { success: false; error: string }

async function clinicianHasPracticeLink(
  clinicianId: string,
  practiceId: string,
): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('clinician_practices')
    .select('practice_id')
    .eq('clinician_id', clinicianId)
    .eq('practice_id', practiceId)
    .maybeSingle()
  return data != null
}

export async function saveActivityLog(
  input: SaveActivityLogInput,
): Promise<SaveActivityLogResult> {
  const auth = await requireProfileSession()
  if ('error' in auth) {
    return { success: false, error: auth.error }
  }

  const { profile } = auth
  if (!isAppRole(profile.role)) {
    return { success: false, error: 'Unauthorized' }
  }

  if (profile.role === 'practice_manager') {
    if (!profile.practice_id || profile.practice_id !== input.practice_id) {
      return { success: false, error: 'Unauthorized' }
    }
  } else if (profile.role === 'clinician') {
    if (
      !profile.clinician_id ||
      profile.clinician_id !== input.clinician_id
    ) {
      return { success: false, error: 'Unauthorized' }
    }
    const sameAsProfilePractice =
      profile.practice_id != null &&
      profile.practice_id === input.practice_id
    const linked = await clinicianHasPracticeLink(
      input.clinician_id,
      input.practice_id,
    )
    if (!sameAsProfilePractice && !linked) {
      return { success: false, error: 'Unauthorized' }
    }
  } else {
    return { success: false, error: 'Unauthorized' }
  }

  const supabase = await createClient()
  const nonZeroEntries = input.entries.filter((e) => e.count > 0)
  if (nonZeroEntries.length === 0) {
    return { success: false, error: 'Please enter at least one appointment count.' }
  }
  const { data: logData, error: logError } = await supabase
    .from('activity_logs')
    .upsert(
      {
        clinician_id: input.clinician_id,
        practice_id: input.practice_id,
        log_date: input.log_date,
        hours_worked: input.hours_worked,
        notes: input.notes ?? null,
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
  const auth = await requireProfileSession()
  if ('error' in auth) {
    return { success: false, error: auth.error }
  }
  if (
    auth.profile.role !== 'practice_manager' ||
    !auth.profile.practice_id ||
    auth.profile.practice_id !== input.practice_id
  ) {
    return { success: false, error: 'Unauthorized' }
  }

  if (input.clinician_ids.length === 0) {
    return { success: false, error: 'Select at least one clinician.' }
  }
  const results = await Promise.all(
    input.clinician_ids.map((clinician_id) =>
      saveActivityLog({
        clinician_id,
        practice_id: input.practice_id,
        log_date: input.log_date,
        hours_worked: input.hours_worked,
        entries: input.entries,
      })
    )
  )
  const failed = results.filter((r) => !r.success)
  if (failed.length > 0) {
    return { success: false, error: `${failed.length} log(s) failed to save.` }
  }
  return { success: true, count: input.clinician_ids.length }
}

export async function addActivityCategory(
  name: string,
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireProfileSession()
  if ('error' in auth) {
    return { success: false, error: auth.error }
  }
  if (
    auth.profile.role !== 'practice_manager' ||
    !auth.profile.practice_id
  ) {
    return { success: false, error: 'Unauthorized' }
  }

  const trimmed = name.trim()
  if (!trimmed) return { success: false, error: 'Category name cannot be empty.' }
  const supabase = await createClient()
  const { error } = await supabase
    .from('activity_categories')
    .insert({ name: trimmed, practice_id: auth.profile.practice_id })
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
