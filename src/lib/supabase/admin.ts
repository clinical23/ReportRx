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
  is_active: boolean | null
}

export type AdminPractice = {
  id: string
  name: string
  organisation_id: string | null
  pcn_id: string | null
  pcn_name: string | null
  is_active: boolean | null
}

export type AdminTeamMember = {
  id: string
  full_name: string | null
  email: string | null
  role: string
  is_active: boolean | null
  working_days: number[] | null
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
    .select('id, name, organisation_id, is_active')
    .eq('organisation_id', organisationId)
    .order('name', { ascending: true })

  return (data ?? []) as AdminPCN[]
}

export async function listPractices(organisationId: string): Promise<AdminPractice[]> {
  const supabase = await createServerClient()
  const [{ data: practices }, { data: pcns }] = await Promise.all([
    supabase
      .from('practices')
      .select('id, name, organisation_id, pcn_id, is_active')
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
    is_active: boolean | null
  }>).map((row) => ({
    id: row.id,
    name: row.name,
    organisation_id: row.organisation_id,
    pcn_id: row.pcn_id,
    pcn_name: row.pcn_id ? (pcnNameById.get(row.pcn_id) ?? null) : null,
    is_active: row.is_active ?? true,
  }))
}

export async function listTeamMembers(organisationId: string): Promise<AdminTeamMember[]> {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, is_active, working_days')
    .eq('organisation_id', organisationId)
    .order('full_name', { ascending: true })

  return (data ?? []) as AdminTeamMember[]
}

export type OrgAdditionalWorkingDayRow = {
  id: string
  clinician_id: string
  work_date: string
  reason: string | null
  approved_by: string
  created_at: string
  clinician_full_name: string | null
  approver_full_name: string | null
}

export async function listOrgAdditionalWorkingDays(
  organisationId: string,
): Promise<OrgAdditionalWorkingDayRow[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('additional_working_days')
    .select('id, clinician_id, work_date, reason, approved_by, created_at')
    .eq('organisation_id', organisationId)
    .order('work_date', { ascending: false })

  if (error) {
    console.error('[listOrgAdditionalWorkingDays]', error.message)
    return []
  }

  const rows = data ?? []
  const idSet = new Set<string>()
  for (const r of rows) {
    idSet.add(String(r.clinician_id))
    idSet.add(String(r.approved_by))
  }
  const ids = [...idSet]
  if (ids.length === 0) return []

  const { data: profs } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', ids)

  const nameBy = new Map(
    (profs ?? []).map((p) => [String(p.id), (p.full_name as string | null)?.trim() || null]),
  )

  return rows.map((r) => ({
    id: String(r.id),
    clinician_id: String(r.clinician_id),
    work_date: String(r.work_date).slice(0, 10),
    reason: r.reason == null ? null : String(r.reason),
    approved_by: String(r.approved_by),
    created_at: String(r.created_at),
    clinician_full_name: nameBy.get(String(r.clinician_id)) ?? null,
    approver_full_name: nameBy.get(String(r.approved_by)) ?? null,
  }))
}
