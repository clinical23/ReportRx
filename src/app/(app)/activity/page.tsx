import { redirect } from "next/navigation";

import {
  getAuthProfile,
  isAppRole,
} from "@/lib/supabase/auth-profile";
import { listPractices, listActivityCategories, listRecentLogsGrouped } from '@/lib/supabase/activity'
import { getPracticeScopeIdsForSession } from '@/lib/supabase/practice-scope'
import { listClinicians } from '@/lib/supabase/data'
import ActivityLogForm from './ActivityLogForm'
import RecentLogs from './RecentLogs'

export const dynamic = 'force-dynamic'

export default async function ActivityPage() {
  const session = await getAuthProfile()
  if (!session?.user) {
    redirect('/login')
  }

  const { profile } = session
  const role = profile && isAppRole(profile.role) ? profile.role : null
  const isClinician = role === 'clinician'
  const isManager = role === 'practice_manager' || role === 'pcn_manager'

  const scope = await getPracticeScopeIdsForSession(session)

  const [clinicians, practices, categories, recentLogs] = await Promise.all([
    listClinicians(),
    listPractices(),
    listActivityCategories(),
    listRecentLogsGrouped(10, scope),
  ])

  let clinicianRecordId: string | null = null
  let clinicianDisplayName = profile?.full_name ?? 'Clinician'

  if (isClinician && profile?.clinician_id) {
    const match = clinicians.find((c) => c.id === profile.clinician_id)
    clinicianRecordId = match?.id ?? profile.clinician_id
    if (match) {
      clinicianDisplayName = match.name
    }
  }

  const variant = isClinician && !isManager ? 'clinician' : 'manager'

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-800">
          Reporting
        </h1>
        <p className="mt-1 text-sm font-normal text-slate-600">
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
      />
      <RecentLogs logs={recentLogs} />
    </div>
  )
}
