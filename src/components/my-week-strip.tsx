import { AlertCircle, Check, Clock } from 'lucide-react'

import type { MyWeekStatusItem } from '@/lib/supabase/activity'

function cardClass(day: MyWeekStatusItem) {
  const logged = day.totalAppointments > 0
  if (day.status === 'future') {
    return 'border-gray-200 bg-gray-50 text-gray-500'
  }
  if (day.status === 'today') {
    return logged
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : 'border-amber-200 bg-amber-50 text-amber-900'
  }
  if (day.status === 'logged') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  }
  return 'border-red-200 bg-red-50 text-red-800'
}

function StatusIcon({ day }: { day: MyWeekStatusItem }) {
  const logged = day.totalAppointments > 0
  if (day.status === 'future') return null
  if (day.status === 'today') {
    return logged ? (
      <span className="inline-flex items-center gap-1">
        <Check className="h-3.5 w-3.5" />
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
      </span>
    ) : (
      <span className="inline-flex items-center gap-1">
        <Clock className="h-3.5 w-3.5" />
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
      </span>
    )
  }
  if (day.status === 'logged') return <Check className="h-3.5 w-3.5" />
  return <AlertCircle className="h-3.5 w-3.5" />
}

function shortDate(isoDate: string) {
  const d = new Date(`${isoDate}T12:00:00`)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function MyWeekStrip({ days }: { days: MyWeekStatusItem[] }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">My Week</h2>
        <p className="text-xs text-gray-500">Mon - Fri status</p>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {days.map((day) => (
          <div
            key={day.date}
            className={`rounded-lg border p-2 text-center ${cardClass(day)}`}
          >
            <div className="flex items-center justify-center gap-1 text-[11px] font-semibold">
              <span>{day.dayName}</span>
              <StatusIcon day={day} />
            </div>
            <p className="mt-0.5 text-xs">{shortDate(day.date)}</p>
            <p className="mt-1 text-[11px] font-medium">
              {day.totalAppointments > 0 ? `${day.totalAppointments} appts` : day.status === 'future' ? 'Future' : 'No log'}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
