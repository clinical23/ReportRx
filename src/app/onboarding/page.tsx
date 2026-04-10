'use client'

import { useMemo, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState('')
  const [noOrg, setNoOrg] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, organisation_id')
        .eq('id', user.id)
        .single()

      const nameOk = Boolean(profile?.full_name?.trim())
      if (nameOk && profile?.organisation_id) {
        // Fully set up — go to dashboard
        router.push('/')
        return
      }

      if (!profile?.organisation_id) {
        // No org assigned — they weren't invited properly
        setNoOrg(true)
        setLoading(false)
        return
      }

      // Has org but no name — needs to complete profile
      setFullName(profile?.full_name || '')
      setLoading(false)
    }
    check()
  }, [router, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) return
    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    )
  }

  // User signed up but has no org — they weren't invited
  if (noOrg) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="mx-4 w-full max-w-sm text-center md:mx-auto">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-teal-600 mb-4">
            <span className="text-white font-bold text-lg">Rx</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Access pending</h1>
          <p className="text-sm text-gray-500 mb-6">
            Your account has been created, but you haven&apos;t been assigned to an organisation yet.
            Please contact your administrator to get access.
          </p>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-left">
            <p className="text-xs text-gray-400 mb-1">Need help?</p>
            <p className="text-sm text-gray-700">
              Ask your PCN manager or practice manager to invite you via ReportRx.
            </p>
          </div>
          <form action="/api/auth/signout" method="POST" className="mt-4">
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut()
                router.push('/login')
              }}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    )
  }

  // User has org but needs to enter their name
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="mx-4 w-full max-w-sm md:mx-auto">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-teal-600 mb-4">
            <span className="text-white font-bold text-lg">Rx</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Welcome to ReportRx</h1>
          <p className="text-sm text-gray-500 mt-1">Just one more step — enter your name</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="mb-1 block text-sm font-medium text-gray-700"
                htmlFor="onboarding-full-name"
              >
                Your full name
              </label>
              <input
                id="onboarding-full-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Layla Ahmed"
                required
                autoFocus
                autoComplete="name"
                className="w-full rounded-lg border border-gray-200 px-3 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                This is how your team will see you in reports.
              </p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-teal-600 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Continue'}
            </button>
          </form>

          {error && (
            <div className="mt-4 px-4 py-3 rounded-lg text-sm bg-red-50 text-red-800 border border-red-200">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
