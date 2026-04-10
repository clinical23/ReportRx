'use client'

import { useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from 'recharts'
import type {
  CategoryBreakdownItem,
  ClinicianBreakdownItem,
  DailyTrendItem,
  DataCompletenessRow,
  PracticeBreakdownItem,
  RecentLogItem,
  ReportingSummary,
} from '@/lib/supabase/reporting'

type Props = {
  startDate: string
  endDate: string
  summary: ReportingSummary
  byCategory: CategoryBreakdownItem[]
  byPractice: PracticeBreakdownItem[]
  dailyTrend: DailyTrendItem[]
  clinicianBreakdown: ClinicianBreakdownItem[]
  recentLogs: RecentLogItem[]
  dataCompleteness: DataCompletenessRow[]
}

function appointmentsTooltipFormatter(value: unknown): [string | number, string] {
  if (Array.isArray(value)) {
    return [String(value.join(', ')), 'Appointments']
  }
  return [typeof value === 'number' || typeof value === 'string' ? value : 0, 'Appointments']
}

function dataCompletenessClass(pct: number): 'good' | 'mid' | 'bad' {
  if (pct > 90) return 'good'
  if (pct >= 70) return 'mid'
  return 'bad'
}

function DateFilter({ startDate, endDate }: { startDate: string; endDate: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const today = new Date()
  const y = today.getFullYear()
  const m = today.getMonth()
  const firstOfMonth = new Date(y, m, 1)
  const lastMonthStart = new Date(y, m - 1, 1)
  const lastMonthEnd = new Date(y, m, 0)
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  const last30 = new Date(today)
  last30.setDate(today.getDate() - 29)

  const toISO = (d: Date) => {
    const yy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yy}-${mm}-${dd}`
  }

  const presets = [
    { label: 'This week', start: toISO(weekStart), end: toISO(today) },
    { label: 'This month', start: toISO(firstOfMonth), end: toISO(today) },
    { label: 'Last month', start: toISO(lastMonthStart), end: toISO(lastMonthEnd) },
    { label: 'Last 30 days', start: toISO(last30), end: toISO(today) },
  ]

  const applyRange = (start: string, end: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('start', start)
    params.set('end', end)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
      <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => applyRange(preset.start, preset.end)}
            className="min-h-11 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 md:min-h-0 md:py-1.5"
          >
            {preset.label}
          </button>
        ))}
      </div>
      <form
        className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:flex md:flex-wrap md:items-end"
        onSubmit={(e) => {
          e.preventDefault()
          const form = new FormData(e.currentTarget)
          const start = String(form.get('start') ?? '')
          const end = String(form.get('end') ?? '')
          if (start && end) applyRange(start, end)
        }}
      >
        <div className="grid gap-1">
          <label className="text-xs text-gray-500">Start</label>
          <input
            name="start"
            type="date"
            defaultValue={startDate}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="grid gap-1">
          <label className="text-xs text-gray-500">End</label>
          <input
            name="end"
            type="date"
            defaultValue={endDate}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="min-h-11 w-full rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 sm:col-span-2 md:min-h-0 md:w-auto"
        >
          Apply
        </button>
      </form>
    </div>
  )
}

export function ReportingDashboardClient({
  startDate,
  endDate,
  summary,
  byCategory,
  byPractice,
  dailyTrend,
  clinicianBreakdown,
  recentLogs,
  dataCompleteness,
}: Props) {
  const { overallCompletenessPct, overallTone } = useMemo(() => {
    const totalExpected = dataCompleteness.reduce((s, r) => s + r.expected_days, 0)
    const totalLogged = dataCompleteness.reduce((s, r) => s + r.logged_days, 0)
    const pct =
      totalExpected === 0
        ? 100
        : Math.round((totalLogged / totalExpected) * 1000) / 10
    return { overallCompletenessPct: pct, overallTone: dataCompletenessClass(pct) }
  }, [dataCompleteness])

  const practiceChartData = useMemo(
    () =>
      byPractice.map((p, idx) => ({
        ...p,
        fill: ['#0D9488', '#0EA5E9', '#6366F1', '#F59E0B', '#14B8A6'][idx % 5],
      })),
    [byPractice],
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Reporting</h1>
        <p className="text-sm text-gray-500">
          {startDate} to {endDate}
        </p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <DateFilter startDate={startDate} endDate={endDate} />
        </div>
        <div className="flex w-full shrink-0 flex-col gap-2 md:w-auto md:max-w-md md:self-center">
          <a
            href={`/reporting/report-preview?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-teal-700 bg-white px-4 py-2 text-sm font-medium text-teal-700 transition-colors hover:bg-teal-50 md:w-auto"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Generate PDF Report
          </a>
          <a
            href={`/api/export?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`}
            download
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 md:w-auto"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
          <p className="text-sm text-gray-500">Total appointments</p>
          <p className="mt-1 text-3xl font-bold text-teal-600">{summary.totalAppointments.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
          <p className="text-sm text-gray-500">Hours logged</p>
          <p className="mt-1 text-3xl font-bold text-teal-600">{summary.totalHours.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
          <p className="text-sm text-gray-500">Active clinicians</p>
          <p className="mt-1 text-3xl font-bold text-teal-600">{summary.activeClinicians.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
          <p className="text-sm text-gray-500">Avg per day</p>
          <p className="mt-1 text-3xl font-bold text-teal-600">{summary.avgAppointmentsPerDay.toLocaleString()}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Data completeness</h2>
          <p className="text-xs text-gray-500">Weekdays (Mon–Fri) with a log vs expected in range</p>
        </div>
        <div className="mt-4 flex flex-wrap items-baseline gap-3">
          <span
            className={`text-4xl font-bold tabular-nums ${
              overallTone === 'good'
                ? 'text-emerald-600'
                : overallTone === 'mid'
                  ? 'text-amber-600'
                  : 'text-red-600'
            }`}
          >
            {overallCompletenessPct.toLocaleString()}%
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              overallTone === 'good'
                ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
                : overallTone === 'mid'
                  ? 'bg-amber-50 text-amber-900 ring-1 ring-amber-200'
                  : 'bg-red-50 text-red-800 ring-1 ring-red-200'
            }`}
            aria-hidden
          >
            <span
              className={`h-2 w-2 rounded-full ${
                overallTone === 'good'
                  ? 'bg-emerald-500'
                  : overallTone === 'mid'
                    ? 'bg-amber-500'
                    : 'bg-red-500'
              }`}
            />
            {overallTone === 'good'
              ? 'On track'
              : overallTone === 'mid'
                ? 'Needs attention'
                : 'At risk'}
          </span>
        </div>
        <div className="mt-4 -mx-1 overflow-x-auto px-1 md:mx-0 md:px-0">
          <table className="w-full min-w-[28rem] text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium text-gray-500">
                <th className="px-3 py-2">Clinician</th>
                <th className="px-3 py-2">Completeness</th>
                <th className="hidden px-3 py-2 sm:table-cell">Logged</th>
                <th className="hidden px-3 py-2 sm:table-cell">Missing</th>
              </tr>
            </thead>
            <tbody>
              {dataCompleteness.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-gray-500">
                    No clinicians in scope for this report.
                  </td>
                </tr>
              ) : (
                dataCompleteness.map((row, idx) => {
                  const tone = dataCompletenessClass(row.completeness_pct)
                  const barColor =
                    tone === 'good'
                      ? 'bg-emerald-500'
                      : tone === 'mid'
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                  const rowHighlight =
                    row.missing_days > 0
                      ? tone === 'bad'
                        ? 'bg-red-50/80'
                        : 'bg-amber-50/80'
                      : ''
                  return (
                    <tr
                      key={`${row.clinician_name}-${idx}`}
                      className={`border-b border-gray-100 last:border-0 ${rowHighlight}`}
                    >
                      <td className="px-3 py-2 font-medium text-gray-900">{row.clinician_name}</td>
                      <td className="px-3 py-2">
                        <div className="flex min-w-[8rem] flex-col gap-1">
                          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                            <div
                              className={`h-full min-w-0 rounded-full transition-[width] ${barColor}`}
                              style={{ width: `${Math.min(100, row.completeness_pct)}%` }}
                            />
                          </div>
                          <span className="text-xs tabular-nums text-gray-600">
                            {row.completeness_pct.toLocaleString()}%
                          </span>
                        </div>
                      </td>
                      <td className="hidden px-3 py-2 tabular-nums text-gray-700 sm:table-cell">
                        {row.logged_days}/{row.expected_days}
                      </td>
                      <td className="hidden px-3 py-2 tabular-nums text-gray-700 sm:table-cell">
                        {row.missing_days}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Appointments by category</h2>
          {byCategory.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-500">No category data for this period.</p>
          ) : (
            <div className="h-[300px] md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCategory} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" label={{ value: 'Appointments', position: 'insideBottom', offset: -4 }} />
                  <YAxis type="category" dataKey="category_name" width={96} />
                  <Tooltip formatter={appointmentsTooltipFormatter} />
                  <Bar dataKey="total_count" fill="#0D9488" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Appointments by practice</h2>
          {practiceChartData.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-500">No practice data for this period.</p>
          ) : (
            <div className="h-[300px] md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={practiceChartData} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" label={{ value: 'Appointments', position: 'insideBottom', offset: -4 }} />
                  <YAxis type="category" dataKey="practice_name" width={96} />
                  <Tooltip formatter={appointmentsTooltipFormatter} />
                  <Bar dataKey="total_count" radius={[0, 6, 6, 0]}>
                    {practiceChartData.map((entry) => (
                      <Cell key={entry.practice_name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Daily trend</h2>
        {dailyTrend.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-500">No daily data for this period.</p>
        ) : (
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrend} margin={{ left: 8, right: 8 }}>
                <defs>
                  <linearGradient id="tealFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0D9488" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#0D9488" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={appointmentsTooltipFormatter} />
                <Area type="monotone" dataKey="total_appointments" stroke="#0D9488" fill="url(#tealFill)" />
                <Line type="monotone" dataKey="total_appointments" stroke="#0D9488" dot />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Clinician breakdown</h2>
        <div className="-mx-1 overflow-x-auto px-1 md:mx-0 md:px-0">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-sm font-medium text-gray-500">
                <th className="px-3 py-2">Clinician</th>
                <th className="px-3 py-2">Appointments</th>
                <th className="px-3 py-2">Hours</th>
                <th className="px-3 py-2">Practices</th>
                <th className="px-3 py-2">Logs</th>
              </tr>
            </thead>
            <tbody>
              {clinicianBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                    No clinician data for this period.
                  </td>
                </tr>
              ) : (
                clinicianBreakdown.map((row, idx) => (
                  <tr
                    key={`${row.clinician_name}-${idx}`}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-3 py-2">{row.clinician_name}</td>
                    <td className="px-3 py-2">{row.total_appointments}</td>
                    <td className="px-3 py-2">{row.total_hours}</td>
                    <td className="px-3 py-2">{row.practices_covered}</td>
                    <td className="px-3 py-2">{row.log_count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Recent activity</h2>
        <div className="flex min-w-0 flex-col gap-2">
          {recentLogs.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">No recent activity for this period.</p>
          ) : (
            recentLogs.map((log, idx) => (
              <div
                key={`${log.clinician_name}-${log.log_date}-${idx}`}
                className="w-full min-w-0 rounded-xl border border-gray-100 px-3 py-3"
              >
                <p className="text-sm font-medium text-gray-900">
                  {log.clinician_name} · {log.practice_name}
                </p>
                <p className="text-xs text-gray-500">
                  {log.log_date} · {log.hours_worked}h
                </p>
                <p className="text-xs text-gray-600">
                  {log.categories.map((c) => `${c.name} x ${c.count}`).join(' · ')}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
