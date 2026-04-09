'use server'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/supabase/auth'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'

// Create a new organisation (superadmin only)
export async function createOrganisation(formData: FormData) {
  await requireRole('superadmin')
  const supabase = await createClient()

  const name = (formData.get('name') as string)?.trim()
  if (!name) return { success: false, error: 'Name is required' }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const { data: org, error } = await supabase
    .from('organisations')
    .insert({ name, slug })
    .select('id, name, slug')
    .single()

  if (error) {
    if (error.code === '23505') return { success: false, error: 'An organisation with that name already exists' }
    return { success: false, error: error.message }
  }

  revalidatePath('/admin')
  return { success: true, organisation: org }
}

// Create a PCN within an org (superadmin or admin)
export async function createPCN(formData: FormData) {
  const profile = await requireRole('superadmin', 'admin')
  const supabase = await createClient()

  const name = (formData.get('name') as string)?.trim()
  const organisationId = formData.get('organisation_id') as string

  // Superadmins can specify any org, admins use their own
  const orgId = profile.role === 'superadmin' ? organisationId : profile.organisation_id

  if (!name || !orgId) return { success: false, error: 'Name and organisation are required' }

  const { error } = await supabase
    .from('pcns')
    .insert({ name, organisation_id: orgId })

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin')
  return { success: true }
}

// Create a practice within a PCN (superadmin or admin)
export async function createPractice(formData: FormData) {
  const profile = await requireRole('superadmin', 'admin')
  const supabase = await createClient()

  const name = (formData.get('name') as string)?.trim()
  const pcnId = formData.get('pcn_id') as string
  const organisationId = formData.get('organisation_id') as string

  const orgId = profile.role === 'superadmin' ? organisationId : profile.organisation_id

  if (!name || !orgId) return { success: false, error: 'Name and organisation are required' }

  const { error } = await supabase
    .from('practices')
    .insert({ name, pcn_id: pcnId || null, organisation_id: orgId })

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin')
  return { success: true }
}

// Invite a user to an organisation (superadmin or admin)
// This pre-creates a profile row so when they sign up, they're already in the org
export async function inviteUser(formData: FormData) {
  const profile = await requireRole('superadmin', 'admin')
  const supabase = await createClient()

  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const role = (formData.get('role') as string) || 'clinician'
  const fullName = (formData.get('full_name') as string)?.trim() || ''
  const organisationId = formData.get('organisation_id') as string

  const orgId = profile.role === 'superadmin' ? organisationId : profile.organisation_id

  if (!email || !orgId) return { success: false, error: 'Email and organisation are required' }

  // Validate role — admins can't create superadmins
  const allowedRoles = profile.role === 'superadmin'
    ? ['clinician', 'manager', 'admin', 'superadmin']
    : ['clinician', 'manager']

  if (!allowedRoles.includes(role)) {
    return { success: false, error: 'You cannot assign that role' }
  }

  // Check if email already exists
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()

  if (existing) return { success: false, error: 'A user with that email already exists' }

  // Pre-create the profile with a placeholder ID
  // When they sign up via magic link, the trigger will update the ID to their real auth ID
  const { error } = await supabase
    .from('profiles')
    .insert({
      id: randomUUID(),
      email,
      full_name: fullName,
      role,
      organisation_id: orgId,
      invited_by: profile.id,
      invited_at: new Date().toISOString(),
    })

  if (error) return { success: false, error: error.message }

  // Send the magic link invite email via Supabase Auth
  const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email)

  if (inviteError) {
    // Profile was created but invite failed — that's ok, they can still use magic link on login page
    console.error('Invite email failed:', inviteError.message)
    return {
      success: true,
      warning: 'User was added but the invite email could not be sent. They can sign in manually at the login page.',
    }
  }

  revalidatePath('/admin')
  return { success: true }
}

// Transfer admin — promote a user to admin or superadmin (superadmin only)
export async function changeUserRole(formData: FormData) {
  await requireRole('superadmin')
  const supabase = await createClient()

  const userId = formData.get('user_id') as string
  const newRole = formData.get('role') as string

  if (!userId || !newRole) return { success: false, error: 'User and role are required' }
  if (!['clinician', 'manager', 'admin', 'superadmin'].includes(newRole)) {
    return { success: false, error: 'Invalid role' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin')
  return { success: true }
}
