'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { logAuditWithServerSupabase } from '@/lib/audit'
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

const ASSIGNABLE_ROLES = [
  'clinician',
  'manager',
  'practice_manager',
  'pcn_manager',
  'admin',
  'superadmin',
] as const

function isAssignableRole(r: string): r is (typeof ASSIGNABLE_ROLES)[number] {
  return (ASSIGNABLE_ROLES as readonly string[]).includes(r)
}

// Transfer admin — superadmin: any assignable role; admin: same except cannot assign superadmin or edit superadmin users
export async function changeUserRole(formData: FormData): Promise<void> {
  const profile = await requireRole('superadmin', 'admin')
  const supabase = await createClient()

  const userId = (formData.get('user_id') as string)?.trim()
  const newRole = formData.get('role') as string

  if (!userId || !newRole) redirectAdminError('User and role are required')
  if (!isAssignableRole(newRole)) redirectAdminError('Invalid role')

  const { data: targetUser } = await supabase
    .from('profiles')
    .select('organisation_id, role')
    .eq('id', userId)
    .single()

  if (!targetUser || targetUser.organisation_id !== profile.organisation_id) {
    redirectAdminError('User not found in your organisation')
  }

  const oldRole = String((targetUser as { role?: string }).role ?? '')

  if (profile.role === 'admin') {
    if (newRole === 'superadmin') redirectAdminError('Only a superadmin can assign that role')
    if (oldRole === 'superadmin') redirectAdminError('You cannot change a superadmin user')
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .eq('organisation_id', profile.organisation_id)

  if (error) redirectAdminError(error.message)

  logAuditWithServerSupabase(supabase, 'edit', 'clinician', userId, {
    old_role: oldRole,
    new_role: newRole,
  })

  revalidatePath('/admin')
  revalidatePath('/clinicians')
}

export async function updateTeamMemberDetails(input: {
  userId: string
  fullName: string
  email: string
}): Promise<{ success: boolean; error?: string }> {
  const profile = await requireRole('superadmin', 'admin')
  const supabase = await createClient()
  const userId = input.userId?.trim()
  const fullName = input.fullName?.trim()
  const email = input.email?.trim().toLowerCase()

  if (!userId || !fullName) {
    return { success: false, error: 'Name is required.' }
  }
  if (!email) {
    return { success: false, error: 'Email is required.' }
  }

  const { data: target } = await supabase
    .from('profiles')
    .select('organisation_id, role')
    .eq('id', userId)
    .maybeSingle()

  if (!target || target.organisation_id !== profile.organisation_id) {
    return { success: false, error: 'User not found in your organisation.' }
  }

  if (profile.role === 'admin' && String(target.role) === 'superadmin') {
    return { success: false, error: 'You cannot edit a superadmin user.' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      email,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .eq('organisation_id', profile.organisation_id)

  if (error) {
    return { success: false, error: error.message }
  }

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const admin = createAdminClient()
      const { error: authErr } = await admin.auth.admin.updateUserById(userId, {
        email,
        user_metadata: { full_name: fullName },
      })
      if (authErr) {
        console.warn('[updateTeamMemberDetails] auth email sync failed:', authErr.message)
      }
    } catch (e) {
      console.warn('[updateTeamMemberDetails] auth admin client error', e)
    }
  }

  logAuditWithServerSupabase(supabase, 'edit', 'clinician', userId, {
    field: 'profile',
    full_name: fullName,
    email,
  })

  revalidatePath('/admin')
  revalidatePath('/clinicians')
  return { success: true }
}

export async function updateTeamMemberRoleClient(input: {
  userId: string
  newRole: string
}): Promise<{ success: boolean; error?: string }> {
  const profile = await requireRole('superadmin', 'admin')
  const supabase = await createClient()
  const userId = input.userId?.trim()
  const newRole = input.newRole?.trim()

  if (!userId || !newRole) {
    return { success: false, error: 'User and role are required.' }
  }
  if (!isAssignableRole(newRole)) {
    return { success: false, error: 'Invalid role.' }
  }

  const { data: targetUser } = await supabase
    .from('profiles')
    .select('organisation_id, role')
    .eq('id', userId)
    .maybeSingle()

  if (!targetUser || targetUser.organisation_id !== profile.organisation_id) {
    return { success: false, error: 'User not found in your organisation.' }
  }

  const oldRole = String((targetUser as { role?: string }).role ?? '')

  if (profile.role === 'admin') {
    if (newRole === 'superadmin') {
      return { success: false, error: 'Only a superadmin can assign that role.' }
    }
    if (oldRole === 'superadmin') {
      return { success: false, error: 'You cannot change a superadmin user.' }
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .eq('organisation_id', profile.organisation_id)

  if (error) {
    return { success: false, error: error.message }
  }

  logAuditWithServerSupabase(supabase, 'edit', 'clinician', userId, {
    old_role: oldRole,
    new_role: newRole,
  })

  revalidatePath('/admin')
  revalidatePath('/clinicians')
  return { success: true }
}

/** Activate or deactivate a team member (admin/superadmin; cannot change self). */
export async function setProfileActive(formData: FormData): Promise<void> {
  const profile = await requireRole('superadmin', 'admin')
  const supabase = await createClient()

  const userId = (formData.get('user_id') as string)?.trim()
  const activeRaw = formData.get('active')
  const makeActive = activeRaw === 'true'

  if (!userId) redirectAdminError('User is required')

  if (userId === profile.id) {
    redirectAdminError('You cannot change your own access status')
  }

  const { data: target } = await supabase
    .from('profiles')
    .select('organisation_id')
    .eq('id', userId)
    .single()

  if (!target || target.organisation_id !== profile.organisation_id) {
    redirectAdminError('User not found in your organisation')
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      is_active: makeActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .eq('organisation_id', profile.organisation_id)

  if (error) redirectAdminError(error.message)

  logAuditWithServerSupabase(supabase, 'deactivate', 'clinician', userId, {
    is_active: makeActive,
  })

  revalidatePath('/admin')
  revalidatePath('/clinicians')
}

/** Same as form `setProfileActive` but returns JSON for client-driven flows. */
export async function setTeamMemberActiveStatus(input: {
  userId: string
  makeActive: boolean
}): Promise<{ success: boolean; error?: string }> {
  const profile = await requireRole('superadmin', 'admin')
  const supabase = await createClient()
  const userId = input.userId?.trim()
  if (!userId) {
    return { success: false, error: 'User is required.' }
  }
  if (userId === profile.id) {
    return { success: false, error: 'You cannot change your own access status.' }
  }

  const { data: target } = await supabase
    .from('profiles')
    .select('organisation_id, role')
    .eq('id', userId)
    .maybeSingle()

  if (!target || target.organisation_id !== profile.organisation_id) {
    return { success: false, error: 'User not found in your organisation.' }
  }

  if (profile.role === 'admin' && String(target.role) === 'superadmin') {
    return { success: false, error: 'You cannot change a superadmin user.' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      is_active: input.makeActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .eq('organisation_id', profile.organisation_id)

  if (error) {
    return { success: false, error: error.message }
  }

  logAuditWithServerSupabase(supabase, 'deactivate', 'clinician', userId, {
    is_active: input.makeActive,
  })
  revalidatePath('/admin')
  revalidatePath('/clinicians')
  return { success: true }
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

export async function updatePcnDetails(input: {
  pcnId: string
  name: string
}): Promise<{ success: boolean; error?: string }> {
  const profile = await requireRole('superadmin', 'admin')
  const supabase = await createClient()
  const pcnId = input.pcnId?.trim()
  const name = input.name?.trim()
  if (!pcnId || !name) {
    return { success: false, error: 'PCN id and name are required.' }
  }

  const { data: row } = await supabase
    .from('pcns')
    .select('id, organisation_id')
    .eq('id', pcnId)
    .maybeSingle()

  if (!row || row.organisation_id !== profile.organisation_id) {
    return { success: false, error: 'PCN not found.' }
  }

  const { error } = await supabase
    .from('pcns')
    .update({ name })
    .eq('id', pcnId)
    .eq('organisation_id', profile.organisation_id)

  if (error) return { success: false, error: error.message }

  logAuditWithServerSupabase(supabase, 'edit', 'admin', pcnId, { type: 'pcn', name })
  revalidatePath('/admin')
  return { success: true }
}

export async function setPcnActiveFlag(input: {
  pcnId: string
  isActive: boolean
}): Promise<{ success: boolean; error?: string }> {
  const profile = await requireRole('superadmin', 'admin')
  const supabase = await createClient()
  const pcnId = input.pcnId?.trim()
  if (!pcnId) return { success: false, error: 'PCN id is required.' }

  const { data: row } = await supabase
    .from('pcns')
    .select('id, organisation_id')
    .eq('id', pcnId)
    .maybeSingle()

  if (!row || row.organisation_id !== profile.organisation_id) {
    return { success: false, error: 'PCN not found.' }
  }

  const { error } = await supabase
    .from('pcns')
    .update({ is_active: input.isActive })
    .eq('id', pcnId)
    .eq('organisation_id', profile.organisation_id)

  if (error) return { success: false, error: error.message }

  logAuditWithServerSupabase(supabase, 'edit', 'admin', pcnId, {
    type: 'pcn',
    is_active: input.isActive,
  })
  revalidatePath('/admin')
  return { success: true }
}

export async function updatePracticeDetails(input: {
  practiceId: string
  name: string
  pcnId: string | null
}): Promise<{ success: boolean; error?: string }> {
  const profile = await requireRole('superadmin', 'admin')
  const supabase = await createClient()
  const practiceId = input.practiceId?.trim()
  const name = input.name?.trim()
  if (!practiceId || !name) {
    return { success: false, error: 'Practice id and name are required.' }
  }

  const { data: pr } = await supabase
    .from('practices')
    .select('id, organisation_id')
    .eq('id', practiceId)
    .maybeSingle()

  if (!pr || pr.organisation_id !== profile.organisation_id) {
    return { success: false, error: 'Practice not found.' }
  }

  const pcnId: string | null = input.pcnId?.trim() || null
  if (pcnId) {
    const { data: pcn } = await supabase
      .from('pcns')
      .select('id')
      .eq('id', pcnId)
      .eq('organisation_id', profile.organisation_id)
      .maybeSingle()
    if (!pcn) {
      return { success: false, error: 'Invalid PCN for this organisation.' }
    }
  }

  const { error } = await supabase
    .from('practices')
    .update({
      name,
      pcn_id: pcnId,
    })
    .eq('id', practiceId)
    .eq('organisation_id', profile.organisation_id)

  if (error) return { success: false, error: error.message }

  logAuditWithServerSupabase(supabase, 'edit', 'admin', practiceId, {
    type: 'practice',
    name,
    pcn_id: pcnId,
  })
  revalidatePath('/admin')
  revalidatePath('/activity')
  revalidatePath('/clinicians')
  return { success: true }
}

export async function setPracticeActiveFlag(input: {
  practiceId: string
  isActive: boolean
}): Promise<{ success: boolean; error?: string }> {
  const profile = await requireRole('superadmin', 'admin')
  const supabase = await createClient()
  const practiceId = input.practiceId?.trim()
  if (!practiceId) return { success: false, error: 'Practice id is required.' }

  const { data: pr } = await supabase
    .from('practices')
    .select('id, organisation_id')
    .eq('id', practiceId)
    .maybeSingle()

  if (!pr || pr.organisation_id !== profile.organisation_id) {
    return { success: false, error: 'Practice not found.' }
  }

  const { error } = await supabase
    .from('practices')
    .update({
      is_active: input.isActive,
    })
    .eq('id', practiceId)
    .eq('organisation_id', profile.organisation_id)

  if (error) return { success: false, error: error.message }

  logAuditWithServerSupabase(supabase, 'edit', 'admin', practiceId, {
    type: 'practice',
    is_active: input.isActive,
  })
  revalidatePath('/admin')
  revalidatePath('/activity')
  return { success: true }
}
