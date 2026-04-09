import {
  changeUserRole,
  createOrganisation,
  createPCN,
  createPractice,
  inviteUser,
} from '@/app/actions/admin'
import { requireRole } from '@/lib/supabase/auth'
import {
  listOrganisations,
  listPCNs,
  listPractices,
  listTeamMembers,
} from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const roleBadgeClasses: Record<string, string> = {
  clinician: 'bg-slate-100 text-slate-700 border border-slate-200',
  manager: 'bg-blue-50 text-blue-700 border border-blue-200',
  admin: 'bg-teal-50 text-teal-700 border border-teal-200',
  superadmin: 'bg-purple-50 text-purple-700 border border-purple-200',
}

export default async function AdminPage() {
  try {
    const profile = await requireRole('superadmin', 'admin')
    const organisations = await listOrganisations(profile)
    const currentOrgId = profile.organisation_id

    const [pcns, practices, teamMembers] = await Promise.all([
      listPCNs(currentOrgId),
      listPractices(currentOrgId),
      listTeamMembers(currentOrgId),
    ])

    async function createOrganisationAction(formData: FormData) {
      'use server'
      await createOrganisation(formData)
    }

    async function createPCNAction(formData: FormData) {
      'use server'
      await createPCN(formData)
    }

    async function createPracticeAction(formData: FormData) {
      'use server'
      await createPractice(formData)
    }

    async function inviteUserAction(formData: FormData) {
      'use server'
      await inviteUser(formData)
    }

    async function changeUserRoleAction(formData: FormData) {
      'use server'
      await changeUserRole(formData)
    }

    return (
      <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Admin</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage organisations, teams, and invitations for ReportRx.
        </p>
      </div>

      {profile.role === 'superadmin' ? (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Organisations</h2>
          </div>

          <div className="mb-6 overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-sm">
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

          <form action={createOrganisationAction} className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              type="text"
              name="name"
              required
              placeholder="New organisation name"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button
              type="submit"
              className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700"
            >
              Create organisation
            </button>
          </form>
        </section>
      ) : null}

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">PCNs</h2>

        <div className="mb-6 overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-sm">
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

        <form action={createPCNAction} className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input type="hidden" name="organisation_id" value={currentOrgId} />
          <input
            type="text"
            name="name"
            required
            placeholder="New PCN name"
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700"
          >
            Add PCN
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Practices</h2>

        <div className="mb-6 overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-sm">
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

        <form action={createPracticeAction} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input type="hidden" name="organisation_id" value={currentOrgId} />
          <input
            type="text"
            name="name"
            required
            placeholder="New practice name"
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <select
            name="pcn_id"
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500"
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
            className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700"
          >
            Add practice
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Team Members</h2>

        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-sm">
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
                          : 'border border-gray-200 bg-gray-50 text-gray-600'
                      }`}
                    >
                      {member.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <form action={changeUserRoleAction} className="flex items-center gap-2">
                      <input type="hidden" name="user_id" value={member.id} />
                      <select
                        name="role"
                        defaultValue={member.role}
                        disabled={profile.role !== 'superadmin'}
                        className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50 disabled:text-gray-400"
                      >
                        <option value="clinician">clinician</option>
                        <option value="manager">manager</option>
                        <option value="admin">admin</option>
                        <option value="superadmin">superadmin</option>
                      </select>
                      <button
                        type="submit"
                        disabled={profile.role !== 'superadmin'}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Save
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {profile.role !== 'superadmin' ? (
          <p className="mt-3 text-xs text-gray-500">
            Role changes are restricted to superadmins.
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Invite User</h2>
        <form action={inviteUserAction} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="organisation_id" value={currentOrgId} />
          <input
            type="email"
            name="email"
            required
            placeholder="Email address"
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <input
            type="text"
            name="full_name"
            placeholder="Full name (optional)"
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <select
            name="role"
            defaultValue="clinician"
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="clinician">Clinician</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700"
            >
              Send invite
            </button>
          </div>
        </form>
      </section>
      </div>
    )
  } catch (error) {
    console.error('ADMIN PAGE ERROR:', error)
    throw error
  }
}
