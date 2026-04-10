'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";

import { editActivityLog } from '@/app/actions/activity'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { formatDateMediumUK, formatRelativeDayLabelUK } from '@/lib/datetime'
import type { AppRole } from '@/lib/supabase/auth-profile'
import type { ActivityCategory } from '@/lib/supabase/activity'

type LogEditRow = {
  id: string
  edited_at: string
  edited_by_name: string
  field_name: string
  old_value: string | null
  new_value: string | null
  reason: string | null
}

export type GroupedRecentLog = {
  log_id: string
  log_date: string
  hours_worked: number | null
  clinician_name: string
  practice_name: string
  submitted_by: string
  entries: { category_id: string; category_name: string; count: number }[]
  is_edited: boolean
  edits: LogEditRow[]
}

type Props = {
  logs: GroupedRecentLog[]
  categories: ActivityCategory[]
  currentUserId: string
  currentUserRole: AppRole | null
}

function canEditLog(log: GroupedRecentLog, userId: string, role: AppRole | null) {
  if (!role) return false
  if (log.submitted_by === userId) return true
  return (
    role === 'manager' ||
    role === 'practice_manager' ||
    role === 'pcn_manager' ||
    role === 'admin' ||
    role === 'superadmin'
  )
}

export default function RecentLogs({
  logs,
  categories,
  currentUserId,
  currentUserRole,
}: Props) {
  const router = useRouter()
  const [editingLogId, setEditingLogId] = useState<string | null>(null)
  const [historyLogId, setHistoryLogId] = useState<string | null>(null)
  const [hoursWorked, setHoursWorked] = useState('')
  const [reason, setReason] = useState('')
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const toast = useToast()

  const activeEditLog = useMemo(
    () => logs.find((l) => l.log_id === editingLogId) ?? null,
    [logs, editingLogId],
  )
  const activeHistoryLog = useMemo(
    () => logs.find((l) => l.log_id === historyLogId) ?? null,
    [logs, historyLogId],
  )

  if (!logs.length) {
    return (
      <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">Recent entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
            <ClipboardList className="h-5 w-5 text-gray-400" />
            <p className="text-sm text-gray-600">
              No recent logs. Start by selecting a practice and logging today&apos;s activity.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalAppointments = logs.reduce(
    (sum, log) => sum + log.entries.reduce((s, e) => s + e.count, 0),
    0,
  )
  const uniqueClinicians = new Set(logs.map((l) => l.clinician_name).filter(Boolean)).size
  const uniqueDays = new Set(logs.map((l) => l.log_date.slice(0, 10))).size

  const openEdit = (log: GroupedRecentLog) => {
    const nextCounts: Record<string, number> = {}
    for (const cat of categories) {
      const row = log.entries.find((e) => e.category_id === cat.id)
      nextCounts[cat.id] = row?.count ?? 0
    }
    setEditingLogId(log.log_id)
    setHoursWorked(log.hours_worked == null ? '' : String(log.hours_worked))
    setCounts(nextCounts)
    setReason('')
    setMessage(null)
  }

  const saveEdit = () => {
    if (!activeEditLog) return
    startTransition(async () => {
      setMessage(null)
      const payload = categories.map((cat) => ({
        category_id: cat.id,
        count: Math.max(0, counts[cat.id] ?? 0),
      }))
      const result = await editActivityLog({
        log_id: activeEditLog.log_id,
        hours_worked: hoursWorked === '' ? null : Number(hoursWorked),
        entries: payload,
        reason,
      })
      if (!result.success) {
        setMessage({ type: 'error', text: result.error })
        toast.error(result.error)
        return
      }
      setMessage({ type: 'success', text: 'Log updated successfully' })
      toast.success('Log updated successfully')
      setEditingLogId(null)
      router.refresh()
    })
  }

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <div className="flex flex-col gap-2">
          <div>
            <CardTitle className="text-base">Recent entries</CardTitle>
            <CardDescription>
              Tap an entry to see the full daily breakdown.
            </CardDescription>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-center sm:text-left">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Entries shown
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-gray-900">
                {logs.length}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-center sm:text-left">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Appointments (total)
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-teal-700">
                {totalAppointments}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-center sm:text-left">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Clinicians · Days
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-gray-900">
                {uniqueClinicians} · {uniqueDays}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 sm:px-6">
        {message ? (
          <div
            className={`mb-3 rounded-xl border px-4 py-2 text-sm ${
              message.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {message.text}
          </div>
        ) : null}

        <ul className="flex min-w-0 flex-col gap-3">
          {logs.map((log) => {
            const appointmentTotal = log.entries.reduce((s, e) => s + e.count, 0)
            const categoryLabel =
              log.entries.length > 0
                ? log.entries
                    .map((e) => (e.count > 1 ? `${e.category_name} (${e.count})` : e.category_name))
                    .join(' · ')
                : 'Uncategorised'
            const editable = canEditLog(log, currentUserId, currentUserRole)

            return (
              <li
                key={log.log_id}
                className="w-full min-w-0 rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm"
              >
                <div className="min-w-0 font-medium text-gray-900">{categoryLabel}</div>
                <div className="mt-1 min-w-0 text-xs text-gray-500">
                  {log.clinician_name || 'Unknown clinician'}
                  {log.practice_name ? ` · ${log.practice_name}` : ''}
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
                  <div>
                    <div className="font-medium text-gray-900">{formatRelativeDayLabelUK(log.log_date)}</div>
                    <div className="text-xs text-gray-500">{formatDateMediumUK(log.log_date)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {log.is_edited ? (
                      <button
                        type="button"
                        onClick={() => setHistoryLogId(log.log_id)}
                        className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800"
                      >
                        Edited
                      </button>
                    ) : null}
                    <span className="inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold tabular-nums text-teal-700 ring-1 ring-teal-200/70">
                      {appointmentTotal} appt{appointmentTotal !== 1 ? 's' : ''}
                    </span>
                    {log.hours_worked != null && log.hours_worked > 0 ? (
                      <span className="text-xs tabular-nums text-gray-400">{log.hours_worked}h</span>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/activity/day?date=${log.log_date.slice(0, 10)}`}
                    className="inline-flex rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    View day
                  </Link>
                  {editable ? (
                    <button
                      type="button"
                      onClick={() => openEdit(log)}
                      className="inline-flex rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
                    >
                      Edit
                    </button>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      </CardContent>

      {activeEditLog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-xl sm:h-auto sm:max-h-[90vh] sm:p-5">
            <h3 className="text-lg font-semibold text-gray-900">Edit activity log</h3>
            <p className="mt-1 text-sm text-gray-500">
              {activeEditLog.clinician_name} · {formatDateMediumUK(activeEditLog.log_date)}
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {categories.map((cat) => (
                <label
                  key={cat.id}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
                >
                  <span className="text-sm text-gray-800">{cat.name}</span>
                  <input
                    type="number"
                    min={0}
                    value={counts[cat.id] ?? 0}
                    onChange={(e) =>
                      setCounts((prev) => ({ ...prev, [cat.id]: Math.max(0, parseInt(e.target.value, 10) || 0) }))
                    }
                    className="w-20 rounded-lg border border-gray-200 bg-white px-2 py-1 text-right text-sm"
                  />
                </label>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="text-gray-600">Hours worked</span>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={hoursWorked}
                  onChange={(e) => setHoursWorked(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-2"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-gray-600">Reason for edit (optional)</span>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-2"
                  placeholder="Correcting entry after review"
                />
              </label>
            </div>

            <div className="sticky bottom-0 mt-5 flex justify-end gap-2 border-t border-gray-100 bg-white pt-3">
              <button
                type="button"
                onClick={() => setEditingLogId(null)}
                className="min-h-11 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={saveEdit}
                className="min-h-11 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
              >
                {isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {activeHistoryLog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-xl sm:h-auto sm:max-h-[90vh] sm:p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Edit history</h3>
              <button
                type="button"
                onClick={() => setHistoryLogId(null)}
                className="min-h-11 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
            <div className="mt-3 max-h-[24rem] overflow-auto">
              {activeHistoryLog.edits.length === 0 ? (
                <p className="text-sm text-gray-500">No edit history.</p>
              ) : (
                <ul className="space-y-2">
                  {activeHistoryLog.edits.map((edit) => (
                    <li key={edit.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm">
                      <p className="font-medium text-gray-900">
                        {edit.field_name}: {edit.old_value ?? '—'} → {edit.new_value ?? '—'}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {formatDateMediumUK(edit.edited_at)} · {edit.edited_by_name}
                      </p>
                      {edit.reason ? <p className="mt-1 text-xs text-gray-600">Reason: {edit.reason}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  )
}
