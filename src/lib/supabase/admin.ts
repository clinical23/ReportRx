import { createClient } from '@supabase/supabase-js'

import { createClient as createServerClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/supabase/auth'

/** Service-role client for server-only admin operations (never import in client code). */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export type AdminOrganisation = {
  id: string
  name: string
  slug: string | null
}

export type AdminPCN = {
  id: string
  name: string
  organisation_id: string | null
}

export type AdminPractice = {
  id: string
  name: string
  organisation_id: string | null
  pcn_id: string | null
  pcn_name: string | null
}

export type AdminTeamMember = {
  id: string
  full_name: string | null
  email: string | null
  role: 'clinician' | 'manager' | 'admin' | 'superadmin'
  is_active: boolean | null
}

export async function listOrganisations(profile: Profile): Promise<AdminOrganisation[]> {
  const supabase = await createServerClient()
  if (profile.role === 'superadmin') {
    const { data } = await supabase
      .from('organisations')
      .select('id, name, slug')
      .order('name', { ascending: true })
    return (data ?? []) as AdminOrganisation[]
  }
  const { data } = await supabase
    .from('organisations')
    .select('id, name, slug')
    .eq('id', profile.organisation_id)
    .order('name', { ascending: true })
  return (data ?? []) as AdminOrganisation[]
}

export async function listPCNs(organisationId: string): Promise<AdminPCN[]> {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('pcns')
    .select('id, name, organisation_id')
    .eq('organisation_id', organisationId)
    .order('name', { ascending: true })

  return (data ?? []) as AdminPCN[]
}

export async function listPractices(organisationId: string): Promise<AdminPractice[]> {
  const supabase = await createServerClient()
  const [{ data: practices }, { data: pcns }] = await Promise.all([
    supabase
      .from('practices')
      .select('id, name, organisation_id, pcn_id')
      .eq('organisation_id', organisationId)
      .order('name', { ascending: true }),
    supabase
      .from('pcns')
      .select('id, name')
      .eq('organisation_id', organisationId),
  ])

  const pcnNameById = new Map((pcns ?? []).map((pcn) => [pcn.id, pcn.name]))

  return ((practices ?? []) as Array<{
    id: string
    name: string
    organisation_id: string | null
    pcn_id: string | null
  }>).map((row) => ({
    id: row.id,
    name: row.name,
    organisation_id: row.organisation_id,
    pcn_id: row.pcn_id,
    pcn_name: row.pcn_id ? (pcnNameById.get(row.pcn_id) ?? null) : null,
  }))
}

export async function listTeamMembers(organisationId: string): Promise<AdminTeamMember[]> {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, is_active')
    .eq('organisation_id', organisationId)
    .order('full_name', { ascending: true })

  return (data ?? []) as AdminTeamMember[]
}
