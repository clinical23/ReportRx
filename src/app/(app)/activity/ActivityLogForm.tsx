'use client'

import { useState, useTransition } from 'react'
import { saveActivityLog, bulkSaveActivityLogs, addActivityCategory } from '@/app/actions/activity'
import type { ActivityCategory } from '@/lib/supabase/activity'
import { todayISOInLondon } from '@/lib/datetime'

type Clinician = { id: string; name: string; role: string }
type Practice = { id: string; name: string }

type Props = {
  clinicians: Clinician[]
  practices: Practice[]
  categories: ActivityCategory[]
  /** Clinician users: single tab, locked identity. Managers: both tabs. */
  variant: 'clinician' | 'manager'
  /** Resolved `clinicians.id` for this user when variant is clinician */
  clinicianRecordId: string | null
  /** Shown when clinician selector is hidden */
  clinicianDisplayName: string
  /** Initial practice from profile.practice_id */
  defaultPracticeId: string | null
}

type CountMap = Record<string, number>

export default function ActivityLogForm({
  clinicians,
  practices,
  categories: initialCategories,
  variant,
  clinicianRecordId,
  clinicianDisplayName,
  defaultPracticeId,
}: Props) {
  const scopedPractices =
    variant === 'clinician' &&
    defaultPracticeId &&
    practices.some((p) => p.id === defaultPracticeId)
      ? practices.filter((p) => p.id === defaultPracticeId)
      : practices

  const initialPractice =
    defaultPracticeId && scopedPractices.some((p) => p.id === defaultPracticeId)
      ? defaultPracticeId
      : scopedPractices[0]?.id ?? ''

  const [tab, setTab] = useState<'single' | 'bulk'>('single')
  const [categories, setCategories] = useState(initialCategories)

  const [clinicianId, setClinicianId] = useState(
    variant === 'clinician'
      ? clinicianRecordId ?? ''
      : clinicians[0]?.id ?? ''
  )
  const [practiceId, setPracticeId] = useState(initialPractice)
  const [logDate, setLogDate] = useState(todayISOInLondon())
  const [hours, setHours] = useState<string>('7.5')
  const [counts, setCounts] = useState<CountMap>({})

  const [bulkClinicianIds, setBulkClinicianIds] = useState<string[]>([])
  const [bulkPracticeId, setBulkPracticeId] = useState(initialPractice)
  const [bulkDate, setBulkDate] = useState(todayISOInLondon())
  const [bulkHours, setBulkHours] = useState<string>('7.5')
  const [bulkCounts, setBulkCounts] = useState<CountMap>({})

  const [newCatName, setNewCatName] = useState('')
  const [showNewCat, setShowNewCat] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const clinicianLocked = variant === 'clinician'
  const canSaveSingle =
    !clinicianLocked || (clinicianRecordId != null && clinicianRecordId !== '')

  function handleCount(map: CountMap, setMap: (m: CountMap) => void, id: string, val: string) {
    setMap({ ...map, [id]: Math.max(0, parseInt(val) || 0) })
  }

  function toggleBulkClinician(id: string) {
    setBulkClinicianIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  function buildEntries(map: CountMap) {
    return categories.map((c) => ({ category_id: c.id, count: map[c.id] ?? 0 }))
  }

  function handleSingle() {
    startTransition(async () => {
      setMessage(null)
      const cid = clinicianLocked ? (clinicianRecordId ?? '') : clinicianId
      if (!cid) {
        setMessage({
          type: 'error',
          text: 'Your account is not linked to a clinician with the same name in the directory. Contact an administrator.',
        })
        return
      }
      const result = await saveActivityLog({
        clinician_id: cid,
        practice_id: practiceId,
        log_date: logDate,
        hours_worked: parseFloat(hours) || null,
        entries: buildEntries(counts),
      })
      if (result.success) {
        setMessage({ type: 'success', text: 'Activity log saved.' })
        setCounts({})
      } else {
        setMessage({ type: 'error', text: result.error })
      }
    })
  }

  function handleBulk() {
    startTransition(async () => {
      setMessage(null)
      const result = await bulkSaveActivityLogs({
        clinician_ids: bulkClinicianIds,
        practice_id: bulkPracticeId,
        log_date: bulkDate,
        hours_worked: parseFloat(bulkHours) || null,
        entries: buildEntries(bulkCounts),
      })
      if (result.success) {
        setMessage({ type: 'success', text: `Saved logs for ${result.count} clinician(s).` })
        setBulkCounts({})
        setBulkClinicianIds([])
      } else {
        setMessage({ type: 'error', text: result.error })
      }
    })
  }

  function handleAddCategory() {
    startTransition(async () => {
      const result = await addActivityCategory(newCatName)
      if (result.success) {
        setCategories((prev) => [
          ...prev,
          { id: crypto.randomUUID(), name: newCatName.trim(), sort_order: prev.length + 1 },
        ])
        setNewCatName('')
        setShowNewCat(false)
      } else {
        setMessage({ type: 'error', text: result.error ?? 'Failed to add category.' })
      }
    })
  }

  const showBulkTab = variant === 'manager'

  return (
    <div>
      {showBulkTab ? (
        <div className="mb-6 flex border-b border-border">
          {(['single', 'bulk'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-sm font-medium -mb-px border-b-2 transition-colors ${
                tab === t
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'single' ? 'Log activity' : 'Bulk assign (manager)'}
            </button>
          ))}
        </div>
      ) : (
        <div className="mb-6 border-b border-border pb-3">
          <h2 className="text-sm font-medium text-foreground">Log activity</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Record your appointments for the selected day.
          </p>
        </div>
      )}

      {message && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
          message.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {clinicianLocked && !canSaveSingle ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No clinician record matches your profile name ({clinicianDisplayName}). An administrator must add you to the clinicians list or align your profile name.
        </div>
      ) : null}

      {tab === 'single' && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-stripe">
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Clinician</label>
              {clinicianLocked ? (
                <p className="py-2 text-sm font-medium text-foreground">{clinicianDisplayName}</p>
              ) : (
                <select value={clinicianId} onChange={(e) => setClinicianId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  {clinicians.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Practice</label>
              <select value={practiceId} onChange={(e) => setPracticeId(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {scopedPractices.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Date</label>
              <input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>

          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Appointment categories
          </p>
          <div className="mb-3 grid grid-cols-2 gap-2">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                <span className="text-sm text-foreground">{cat.name}</span>
                <input type="number" min={0} value={counts[cat.id] ?? ''} placeholder="0"
                  onChange={(e) => handleCount(counts, setCounts, cat.id, e.target.value)}
                  className="w-16 rounded-md border border-border bg-background px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            ))}
          </div>

          {showNewCat ? (
            <div className="mb-4 flex flex-wrap gap-2">
              <input type="text" placeholder="Category name" value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                className="min-w-[8rem] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <button type="button" onClick={handleAddCategory} disabled={isPending || !newCatName.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">Add</button>
              <button type="button" onClick={() => setShowNewCat(false)}
                className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
            </div>
          ) : (
            <button type="button" onClick={() => setShowNewCat(true)} className="mb-4 text-sm text-primary hover:text-primary/90">
              + Add category
            </button>
          )}

          <div className="flex items-center gap-3 border-t border-border pt-4">
            <label className="whitespace-nowrap text-sm text-muted-foreground">Hours worked</label>
            <input type="number" min={0} step={0.5} value={hours} onChange={(e) => setHours(e.target.value)}
              className="w-20 rounded-lg border border-border bg-background px-2 py-1.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={() => { setCounts({}); setMessage(null) }}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50">Clear</button>
            <button type="button" onClick={handleSingle} disabled={isPending || !canSaveSingle}
              className="rounded-lg bg-primary px-5 py-2 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
              {isPending ? 'Saving…' : 'Save entry'}
            </button>
          </div>
        </div>
      )}

      {showBulkTab && tab === 'bulk' && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-stripe">
          <p className="mb-5 text-sm text-muted-foreground">
            Select multiple clinicians — the same activity counts will be saved for each.
          </p>

          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Clinicians
          </p>
          <div className="mb-5 grid grid-cols-2 gap-2">
            {clinicians.map((c) => (
              <label key={c.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${
                bulkClinicianIds.includes(c.id)
                  ? 'border-foreground bg-muted/40'
                  : 'border-border hover:border-muted-foreground/40'
              }`}>
                <input type="checkbox" checked={bulkClinicianIds.includes(c.id)}
                  onChange={() => toggleBulkClinician(c.id)} className="rounded" />
                <div>
                  <p className="text-sm font-medium text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.role}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Practice</label>
              <select value={bulkPracticeId} onChange={(e) => setBulkPracticeId(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {practices.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Date</label>
              <input type="date" value={bulkDate} onChange={(e) => setBulkDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Hours worked</label>
              <input type="number" min={0} step={0.5} value={bulkHours} onChange={(e) => setBulkHours(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>

          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Appointment categories
          </p>
          <div className="mb-5 grid grid-cols-2 gap-2">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                <span className="text-sm text-foreground">{cat.name}</span>
                <input type="number" min={0} value={bulkCounts[cat.id] ?? ''} placeholder="0"
                  onChange={(e) => handleCount(bulkCounts, setBulkCounts, cat.id, e.target.value)}
                  className="w-16 rounded-md border border-border bg-background px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">
              {bulkClinicianIds.length === 0 ? 'No clinicians selected' : `${bulkClinicianIds.length} clinician(s) selected`}
            </p>
            <button type="button" onClick={handleBulk} disabled={isPending || bulkClinicianIds.length === 0}
              className="rounded-lg bg-primary px-5 py-2 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
              {isPending ? 'Saving…' : `Save for ${bulkClinicianIds.length || '—'} clinician(s)`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
