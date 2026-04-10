import {
  changeUserRole,
  createOrganisation,
  createPCN,
  createPractice,
} from '@/app/actions/admin'
import { AdminInviteForm } from '@/components/admin/admin-invite-form'
import { AdminPracticeAssignments } from '@/components/admin/admin-practice-assignments'
import { requireRole } from '@/lib/supabase/auth'
import {
  listOrganisations,
  listPCNs,
  listPractices,
  listTeamMembers,
} from '@/lib/supabase/admin'
import { listOrgClinicianPracticeAssignments } from '@/lib/supabase/clinician-practice-assignments'
import { Users } from "lucide-react";
import type { Metadata } from "next";

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: "Admin" };

const roleBadgeClasses: Record<string, string> = {
  clinician: 'bg-slate-100 text-slate-700 border border-slate-200',
  manager: 'bg-teal-50 text-teal-700 border border-teal-200',
  admin: 'bg-blue-50 text-blue-700 border border-blue-200',
  superadmin: 'bg-purple-50 text-purple-700 border border-purple-200',
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error: actionError } = await searchParams
  const profile = await requireRole('superadmin', 'admin')
  const organisations = await listOrganisations(profile)
  const currentOrgId = profile.organisation_id

  const [pcns, practices, teamMembers, assignmentRows] = await Promise.all([
    listPCNs(currentOrgId),
    listPractices(currentOrgId),
    listTeamMembers(currentOrgId),
    listOrgClinicianPracticeAssignments(currentOrgId),
  ])

  const clinicianProfilesForAssignments = teamMembers
    .filter((m) => m.role === 'clinician')
    .map((m) => ({
      id: m.id,
      full_name: m.full_name,
      email: m.email,
    }))

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {actionError ? (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          role="alert"
        >
          {actionError}
        </div>
      ) : null}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
        <h1 className="text-2xl font-semibold text-gray-900">Admin</h1>
        <p className="mt-1 text-sm text-gray-500">
          Organisation administration, team management and invitations.
        </p>
      </div>

      {profile.role === 'superadmin' ? (
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Organisations</h2>
          </div>

          <div className="mb-6 overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full min-w-[20rem] text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-600">
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-4 py-2.5 font-medium">Slug</th>
                </tr>
              </thead>
              <tbody>
                {organisations.map((org) => (
                  <tr key={org.id} className="border-t border-gray-100">
                    <td className="px-4 py-2.5 text-gray-900">{org.name}</td>
                    <td className="px-4 py-2.5 text-gray-500">{org.slug || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form
            action={createOrganisation}
            className="flex flex-col gap-3 md:grid md:grid-cols-[1fr_auto]"
          >
            <input
              type="text"
              name="name"
              required
              placeholder="New organisation name"
              className="w-full rounded-lg border border-gray-200 px-3 py-3 text-base focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500 md:py-2.5 md:text-sm"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-teal-600 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-teal-700 md:w-auto md:py-2.5 md:text-sm"
            >
              Create organisation
            </button>
          </form>
        </section>
      ) : null}

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">PCNs</h2>

        <div className="mb-6 overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[16rem] text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-600">
                <th className="px-4 py-2.5 font-medium">Name</th>
              </tr>
            </thead>
            <tbody>
              {pcns.map((pcn) => (
                <tr key={pcn.id} className="border-t border-gray-100">
                  <td className="px-4 py-2.5 text-gray-900">{pcn.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form
          action={createPCN}
          className="flex flex-col gap-3 md:grid md:grid-cols-[1fr_auto]"
        >
          <input type="hidden" name="organisation_id" value={currentOrgId} />
          <input
            type="text"
            name="name"
            required
            placeholder="New PCN name"
            className="w-full rounded-lg border border-gray-200 px-3 py-3 text-base focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500 md:py-2.5 md:text-sm"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-teal-600 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-teal-700 md:w-auto md:py-2.5 md:text-sm"
          >
            Add PCN
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Practices</h2>

        <div className="mb-6 overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[22rem] text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-600">
                <th className="px-4 py-2.5 font-medium">Practice</th>
                <th className="px-4 py-2.5 font-medium">PCN</th>
              </tr>
            </thead>
            <tbody>
              {practices.map((practice) => (
                <tr key={practice.id} className="border-t border-gray-100">
                  <td className="px-4 py-2.5 text-gray-900">{practice.name}</td>
                  <td className="px-4 py-2.5 text-gray-500">{practice.pcn_name || 'No PCN'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form
          action={createPractice}
          className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]"
        >
          <input type="hidden" name="organisation_id" value={currentOrgId} />
          <input
            type="text"
            name="name"
            required
            placeholder="New practice name"
            className="w-full rounded-lg border border-gray-200 px-3 py-3 text-base focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500 md:py-2.5 md:text-sm"
          />
          <select
            name="pcn_id"
            className="w-full rounded-lg border border-gray-200 px-3 py-3 text-base focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500 md:py-2.5 md:text-sm"
            defaultValue=""
          >
            <option value="">No PCN</option>
            {pcns.map((pcn) => (
              <option key={pcn.id} value={pcn.id}>
                {pcn.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="w-full rounded-lg bg-teal-600 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-teal-700 md:w-auto md:py-2.5 md:text-sm"
          >
            Add practice
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Team Members</h2>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          {teamMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
              <Users className="h-5 w-5 text-gray-400" />
              <p className="text-sm text-gray-600">
                No team members yet. Use the invite form below to add your first.
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-600">
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-4 py-2.5 font-medium">Email</th>
                  <th className="px-4 py-2.5 font-medium">Role</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Update Role</th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((member) => (
                <tr key={member.id} className="border-t border-gray-100">
                  <td className="px-4 py-2.5 text-gray-900">{member.full_name || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-600">{member.email || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        roleBadgeClasses[member.role] ?? 'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}
                    >
                      {member.role}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        member.is_active
                          ? 'border border-green-200 bg-green-50 text-green-700'
                          : 'border border-amber-200 bg-amber-50 text-amber-700'
                      }`}
                    >
                      {member.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <form action={changeUserRole} className="flex flex-col gap-2 md:flex-row md:items-center">
                      <input type="hidden" name="user_id" value={member.id} />
                      <select
                        name="role"
                        defaultValue={member.role}
                        disabled={profile.role !== 'superadmin'}
                        className="min-h-11 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50 disabled:text-gray-400 md:min-h-0 md:w-auto md:px-2 md:py-1.5 md:text-xs"
                      >
                        <option value="clinician">clinician</option>
                        <option value="manager">manager</option>
                        <option value="admin">admin</option>
                        <option value="superadmin">superadmin</option>
                      </select>
                      <button
                        type="submit"
                        disabled={profile.role !== 'superadmin'}
                        className="min-h-11 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 md:min-h-0 md:py-1.5 md:text-xs"
                      >
                        Save
                      </button>
                    </form>
                  </td>
                </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {profile.role !== 'superadmin' ? (
          <p className="mt-3 text-xs text-gray-500">
            Role changes are restricted to superadmins.
          </p>
        ) : null}
      </section>

      <AdminPracticeAssignments
        clinicians={clinicianProfilesForAssignments}
        practices={practices.map((p) => ({
          id: p.id,
          name: p.name,
          pcn_id: p.pcn_id,
          pcn_name: p.pcn_name,
        }))}
        assignments={assignmentRows}
      />

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Invite User</h2>
        <AdminInviteForm
          organisationId={currentOrgId}
          allowAdminRole={profile.role === 'superadmin'}
        />
      </section>
    </div>
  )
}
