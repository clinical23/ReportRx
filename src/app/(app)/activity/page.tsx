import { redirect } from "next/navigation";

import {
  getAuthProfile,
  isAppRole,
} from "@/lib/supabase/auth-profile";
import {
  listPractices,
  listActivityCategories,
  listRecentLogsGrouped,
} from "@/lib/supabase/activity";
import {
  getOrganisationSettingsRecord,
  parseDefaultHoursPerDay,
} from "@/lib/report/org";
import { getPracticeScopeIdsForSession } from '@/lib/supabase/practice-scope'
import { listClinicians } from '@/lib/supabase/data'
import ActivityLogForm from './ActivityLogForm'
import RecentLogs from './RecentLogs'

export const dynamic = 'force-dynamic'

export default async function ActivityPage() {
  try {
    const session = await getAuthProfile()
    if (!session?.user) {
      redirect('/login')
    }

    const { profile } = session
    const role = profile && isAppRole(profile.role) ? profile.role : null
    const isClinician = role === 'clinician'
    const isManager =
      role === 'practice_manager' ||
      role === 'pcn_manager' ||
      role === 'manager' ||
      role === 'admin' ||
      role === 'superadmin'

    const scope = await getPracticeScopeIdsForSession(session)

    const profileOrgId =
      profile &&
      "organisation_id" in profile &&
      typeof (profile as { organisation_id?: string }).organisation_id ===
        "string"
        ? (profile as { organisation_id: string }).organisation_id
        : null

    const orgRecordPromise = profileOrgId
      ? getOrganisationSettingsRecord(profileOrgId)
      : Promise.resolve(null)

    const [clinicians, practices, categories, recentLogs, orgRecord] =
      await Promise.all([
        listClinicians(),
        listPractices(),
        listActivityCategories(),
        listRecentLogsGrouped(10, scope),
        orgRecordPromise,
      ])

    const defaultHoursPerDay = parseDefaultHoursPerDay(orgRecord?.settings ?? null)

    const clinicianRecordId: string | null = profile?.id ?? null
    let clinicianDisplayName = profile?.full_name ?? 'Clinician'

    if (isClinician && profile?.full_name) {
      clinicianDisplayName = profile.full_name
    }

    const variant = isClinician && !isManager ? 'clinician' : 'manager'

    return (
      <div className="mx-auto min-w-0 max-w-4xl space-y-8 overflow-x-hidden pb-24 md:pb-0">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Activity
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Log appointments and review recent entries by clinician, practice and day
          </p>
        </div>

        {!profile ? (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Your profile row is missing. Ask an administrator to run the profiles migration or create a profile for your account in Supabase.
          </div>
        ) : null}

        <ActivityLogForm
          clinicians={clinicians}
          practices={practices}
          categories={categories}
          variant={variant}
          clinicianRecordId={clinicianRecordId}
          clinicianDisplayName={clinicianDisplayName}
          defaultPracticeId={profile?.practice_id ?? null}
          defaultHoursPerDay={defaultHoursPerDay}
        />
        <RecentLogs
          logs={recentLogs}
          categories={categories}
          currentUserId={profile?.id ?? ''}
          currentUserRole={role}
        />
      </div>
    )
  } catch (error) {
    console.error('ACTIVITY PAGE ERROR:', error)
    throw error
  }
}
