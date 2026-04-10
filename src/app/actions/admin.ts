'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { requireRole } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/server'

function redirectAdminError(message: string): never {
  redirect(`/admin?error=${encodeURIComponent(message)}`)
}

// Create a new organisation (superadmin only)
export async function createOrganisation(formData: FormData): Promise<void> {
  await requireRole('superadmin')
  const supabase = await createClient()

  const name = (formData.get('name') as string)?.trim()
  if (!name) redirectAdminError('Name is required')

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const { error } = await supabase.from('organisations').insert({ name, slug }).select('id').single()

  if (error) {
    if (error.code === '23505')
      redirectAdminError('An organisation with that name already exists')
    redirectAdminError(error.message)
  }

  revalidatePath('/admin')
}

// Create a PCN within an org (superadmin or admin)
export async function createPCN(formData: FormData): Promise<void> {
  const profile = await requireRole('superadmin', 'admin')
  const supabase = await createClient()

  const name = (formData.get('name') as string)?.trim()
  const organisationId = (formData.get('organisation_id') as string)?.trim()

  const orgId =
    profile.role === 'superadmin' ? organisationId || profile.organisation_id : profile.organisation_id

  if (!name || !orgId) redirectAdminError('Name and organisation are required')

  const { error } = await supabase.from('pcns').insert({ name, organisation_id: orgId })

  if (error) redirectAdminError(error.message)

  revalidatePath('/admin')
}

// Create a practice within a PCN (superadmin or admin)
export async function createPractice(formData: FormData): Promise<void> {
  const profile = await requireRole('superadmin', 'admin')
  const supabase = await createClient()

  const name = (formData.get('name') as string)?.trim()
  const pcnId = (formData.get('pcn_id') as string)?.trim()
  const organisationId = (formData.get('organisation_id') as string)?.trim()

  const orgId =
    profile.role === 'superadmin' ? organisationId || profile.organisation_id : profile.organisation_id

  if (!name || !orgId) redirectAdminError('Name and organisation are required')

  const { error } = await supabase
    .from('practices')
    .insert({ name, pcn_id: pcnId || null, organisation_id: orgId })

  if (error) redirectAdminError(error.message)

  revalidatePath('/admin')
}

// Transfer admin — promote a user to admin or superadmin (superadmin only)
export async function changeUserRole(formData: FormData): Promise<void> {
  const profile = await requireRole('superadmin')
  const supabase = await createClient()

  const userId = formData.get('user_id') as string
  const newRole = formData.get('role') as string

  if (!userId || !newRole) redirectAdminError('User and role are required')
  if (!['clinician', 'manager', 'admin', 'superadmin'].includes(newRole)) {
    redirectAdminError('Invalid role')
  }

  // Verify target user belongs to the same organisation
  const { data: targetUser } = await supabase
    .from('profiles')
    .select('organisation_id')
    .eq('id', userId)
    .single()

  if (!targetUser || targetUser.organisation_id !== profile.organisation_id) {
    redirectAdminError('User not found in your organisation')
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .eq('organisation_id', profile.organisation_id)

  if (error) redirectAdminError(error.message)

  revalidatePath('/admin')
}

export async function syncClinicianPracticeAssignments(
  clinicianId: string,
  practiceIds: string[],
): Promise<{ success: boolean; error?: string }> {
  const profile = await requireRole('superadmin', 'admin')
  const supabase = await createClient()
  const orgId = profile.organisation_id
  const trimmedClinician = clinicianId?.trim()
  if (!trimmedClinician) {
    return { success: false, error: 'Clinician is required.' }
  }

  const { data: target } = await supabase
    .from('profiles')
    .select('id, role, organisation_id')
    .eq('id', trimmedClinician)
    .maybeSingle()

  if (
    !target ||
    target.organisation_id !== orgId ||
    target.role !== 'clinician'
  ) {
    return { success: false, error: 'Invalid clinician for this organisation.' }
  }

  const uniquePracticeIds = [...new Set(practiceIds.filter(Boolean))]

  if (uniquePracticeIds.length > 0) {
    const { data: valid, error: validErr } = await supabase
      .from('practices')
      .select('id')
      .eq('organisation_id', orgId)
      .in('id', uniquePracticeIds)
    if (validErr) {
      return { success: false, error: validErr.message }
    }
    if (!valid || valid.length !== uniquePracticeIds.length) {
      return { success: false, error: 'One or more practices are invalid.' }
    }
  }

  const { data: existing, error: existingErr } = await supabase
    .from('clinician_practice_assignments')
    .select('practice_id')
    .eq('clinician_id', trimmedClinician)
    .eq('organisation_id', orgId)

  if (existingErr) {
    return { success: false, error: existingErr.message }
  }

  const existingSet = new Set(
    (existing ?? []).map((r) => String(r.practice_id)),
  )
  const newSet = new Set(uniquePracticeIds)
  const toRemove = [...existingSet].filter((id) => !newSet.has(id))
  const toAdd = [...newSet].filter((id) => !existingSet.has(id))

  if (toRemove.length > 0) {
    const { error: delErr } = await supabase
      .from('clinician_practice_assignments')
      .delete()
      .eq('clinician_id', trimmedClinician)
      .eq('organisation_id', orgId)
      .in('practice_id', toRemove)
    if (delErr) {
      return { success: false, error: delErr.message }
    }
  }

  if (toAdd.length > 0) {
    const { error: insErr } = await supabase
      .from('clinician_practice_assignments')
      .insert(
        toAdd.map((practice_id) => ({
          clinician_id: trimmedClinician,
          practice_id,
          organisation_id: orgId,
          assigned_by: profile.id,
        })),
      )
    if (insErr) {
      return { success: false, error: insErr.message }
    }
  }

  revalidatePath('/admin')
  revalidatePath('/activity')
  revalidatePath('/clinicians')
  return { success: true }
}
