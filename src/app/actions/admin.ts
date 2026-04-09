'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createAnonAuthClient } from '@/lib/supabase/anon-server'
import { requireRole } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/server'

function redirectAdminError(message: string): never {
  redirect(`/admin?error=${encodeURIComponent(message)}`)
}

function appOrigin(): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'http://localhost:3000'
  return base.replace(/\/$/, '')
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

export type InviteUserResult =
  | { success: true; message: string }
  | { success: false; error: string }

// Record a pending invite and optionally send a magic link (anon key only — no service role).
export async function inviteUser(formData: FormData): Promise<InviteUserResult> {
  const profile = await requireRole('superadmin', 'admin')
  const supabase = await createClient()

  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const role = (formData.get('role') as string)?.trim()
  const fullName = (formData.get('full_name') as string)?.trim()
  const organisationId = (formData.get('organisation_id') as string)?.trim()

  const orgId =
    profile.role === 'superadmin' ? organisationId || profile.organisation_id : profile.organisation_id

  if (!email || !orgId) {
    return { success: false, error: 'Email and organisation are required' }
  }

  if (!fullName) {
    return { success: false, error: 'Full name is required' }
  }

  if (!role) {
    return { success: false, error: 'Please select a role' }
  }

  const allowedRoles =
    profile.role === 'superadmin'
      ? ['clinician', 'manager', 'admin', 'superadmin']
      : ['clinician', 'manager']

  if (!allowedRoles.includes(role)) {
    return { success: false, error: 'You cannot assign that role' }
  }

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existingProfile) {
    return { success: false, error: 'A user with that email already exists' }
  }

  await supabase.from('organisation_invites').delete().eq('email', email)

  const { error: inviteRowError } = await supabase.from('organisation_invites').insert({
    email,
    organisation_id: orgId,
    role,
    full_name: fullName,
    invited_by: profile.id,
  })

  if (inviteRowError) {
    console.error('[inviteUser] organisation_invites', inviteRowError.message)
    if (inviteRowError.code === '42P01') {
      return {
        success: false,
        error:
          'Invites table is not installed. Apply migration 20260410300000_organisation_invites.sql in Supabase.',
      }
    }
    return { success: false, error: inviteRowError.message }
  }

  const origin = appOrigin()
  const redirectTo = `${origin}/auth/callback?next=/onboarding`

  try {
    const anon = createAnonAuthClient()
    const { error: otpError } = await anon.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    })
    if (otpError) {
      console.warn('[inviteUser] signInWithOtp:', otpError.message)
    }
  } catch (e) {
    console.warn('[inviteUser] OTP client error', e)
  }

  revalidatePath('/admin')

  const loginUrl = `${origin}/login`
  return {
    success: true,
    message: `User profile created. Send them this login link: ${loginUrl} — they can sign in with their email and will be connected to your organisation once they complete magic link sign-in.`,
  }
}

export type InviteFormState = {
  ok: boolean
  message: string
  error: string
}

export async function inviteUserFormAction(
  _prev: InviteFormState,
  formData: FormData,
): Promise<InviteFormState> {
  const result = await inviteUser(formData)
  if (result.success) {
    return { ok: true, message: result.message, error: '' }
  }
  return { ok: false, message: '', error: result.error }
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
