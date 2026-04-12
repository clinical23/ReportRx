/** ISO-8601 weekday: 1 = Monday … 7 = Sunday (matches Postgres ISODOW). */

export const DEFAULT_WORKING_DAYS: readonly number[] = [1, 2, 3, 4, 5]

const ISO_DAY_LABELS = [
  "",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const

export type IsoDayLabel =
  | "Mon"
  | "Tue"
  | "Wed"
  | "Thu"
  | "Fri"
  | "Sat"
  | "Sun"

export function isoWeekdayFromYmd(isoYmd: string): number {
  const d = new Date(`${isoYmd.slice(0, 10)}T12:00:00`)
  const js = d.getDay()
  return js === 0 ? 7 : js
}

export function normalizeWorkingDays(raw: unknown): number[] {
  if (!raw || !Array.isArray(raw)) {
    return [...DEFAULT_WORKING_DAYS]
  }
  const nums = raw
    .map((x) => Number(x))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 7)
  const unique = [...new Set(nums)].sort((a, b) => a - b)
  return unique.length > 0 ? unique : [...DEFAULT_WORKING_DAYS]
}

export function dayLabelForIsoWeekday(isoDow: number): IsoDayLabel {
  if (isoDow < 1 || isoDow > 7) return "Mon"
  return ISO_DAY_LABELS[isoDow] as IsoDayLabel
}


/** Inclusive ISO calendar dates from start to end (YYYY-MM-DD). */
export function eachIsoDateInRangeInclusive(
  startYmd: string,
  endYmd: string,
): string[] {
  const start = new Date(`${startYmd.slice(0, 10)}T12:00:00`).getTime()
  const end = new Date(`${endYmd.slice(0, 10)}T12:00:00`).getTime()
  if (Number.isNaN(start) || Number.isNaN(end) || start > end) return []
  const out: string[] = []
  for (let t = start; t <= end; t += 86_400_000) {
    out.push(new Date(t).toISOString().slice(0, 10))
  }
  return out
}

/**
 * Expected working dates in [startYmd, endYmd]: weekdays in workingDays plus
 * additionalDates, de-duplicated.
 */
export function buildExpectedDateSet(
  workingDays: number[],
  additionalDates: Iterable<string>,
  startYmd: string,
  endYmd: string,
): Set<string> {
  const set = new Set<string>()
  const wdSet = new Set(workingDays)
  for (const ymd of eachIsoDateInRangeInclusive(startYmd, endYmd)) {
    if (wdSet.has(isoWeekdayFromYmd(ymd))) set.add(ymd)
  }
  for (const d of additionalDates) {
    const y = String(d).slice(0, 10)
    if (y >= startYmd.slice(0, 10) && y <= endYmd.slice(0, 10)) set.add(y)
  }
  return set
}

export function isDateExpectedForClinician(
  isoYmd: string,
  workingDays: unknown,
  additionalDates: Set<string>,
): boolean {
  const y = isoYmd.slice(0, 10)
  if (additionalDates.has(y)) return true
  return normalizeWorkingDays(workingDays).includes(isoWeekdayFromYmd(y))
}
