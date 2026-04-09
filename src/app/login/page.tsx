'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({
        type: 'success',
        text: 'Check your email — we sent you a magic link to sign in.',
      })
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="mx-4 w-full max-w-sm md:mx-auto">
        {/* Logo / Brand */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-teal-600 mb-4">
            <span className="text-white font-bold text-lg">Rx</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">ReportRx</h1>
          <p className="text-sm text-gray-500 mt-1">Clinical activity tracking for primary care</p>
        </div>

        {/* Login card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-medium text-gray-900">Sign in</h2>
          <p className="mb-6 text-sm text-gray-500">
            Enter your email and we&apos;ll send you a magic link.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@nhs.net"
                required
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-teal-600 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Sending link...' : 'Send magic link'}
            </button>
          </form>

          {message && (
            <div
              className={`mt-4 px-4 py-3 rounded-lg text-sm ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          By signing in, you agree to ReportRx&apos;s terms of service.
        </p>
      </div>
    </div>
  )
}
