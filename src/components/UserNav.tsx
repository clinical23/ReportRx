'use client'

import { useState, useRef, useEffect } from 'react'

type Props = {
  fullName: string
  email: string
  role: string
  orgName: string
  signOutAction: () => Promise<void>
}

export default function UserNav({ fullName, email, role, orgName, signOutAction }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const roleLabel: Record<string, string> = {
    clinician: 'Clinician',
    manager: 'Manager',
    admin: 'Admin',
    superadmin: 'Super Admin',
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
          <span className="text-xs font-medium text-teal-700">{initials}</span>
        </div>
        <div className="text-left hidden sm:block">
          <p className="text-sm font-medium text-gray-900 leading-tight">{fullName}</p>
          <p className="text-xs text-gray-400 leading-tight">{orgName}</p>
        </div>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg py-2 z-50">
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">{fullName}</p>
            <p className="text-xs text-gray-500">{email}</p>
            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
              {roleLabel[role] || role}
            </span>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
