// Auth helper functions used across the app
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type Profile = {
  id: string
  organisation_id: string
  full_name: string
  email: string
  role:
    | 'clinician'
    | 'manager'
    | 'practice_manager'
    | 'pcn_manager'
    | 'admin'
    | 'superadmin'
  is_active: boolean
}

// Get the current authenticated user's profile (server-side only)
// Redirects to login if not authenticated
export async function getProfile(): Promise<Profile> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, organisation_id, full_name, email, role, is_active')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    redirect('/login')
  }

  if (!profile.organisation_id) {
    redirect('/onboarding')
  }

  return profile as Profile
}

// Check if the current user has one of the required roles
export async function requireRole(...roles: Profile['role'][]): Promise<Profile> {
  const profile = await getProfile()
  if (!roles.includes(profile.role)) {
    redirect('/')
  }
  return profile
}

// Sign out (for use in server actions)
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
