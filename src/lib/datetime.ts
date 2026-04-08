/** UK display and Europe/London calendar boundaries for ReportRx */

export const UK_TIMEZONE = "Europe/London";

/** YYYY-MM-DD for `<input type="date" />` — calendar "today" in London */
export function todayISOInLondon(ref: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: UK_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(ref);

  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  if (!y || !m || !d) return ref.toISOString().slice(0, 10);
  return `${y}-${m}-${d}`;
}

/** DD/MM/YYYY */
export function formatDateUK(
  input: string | Date,
  options: { includeTime?: boolean } = {},
): string {
  const d =
    typeof input === "string"
      ? input.length >= 10
        ? new Date(input.slice(0, 10) + "T12:00:00")
        : new Date(input)
      : input;
  if (Number.isNaN(d.getTime())) return "—";

  const dateStr = d.toLocaleDateString("en-GB", {
    timeZone: UK_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  if (options.includeTime) {
    const timeStr = d.toLocaleTimeString("en-GB", {
      timeZone: UK_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${dateStr} ${timeStr}`;
  }

  return dateStr;
}

/** DD/MM/YYYY HH:mm in Europe/London */
export function formatDateTimeUK(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "—";
  const dateStr = d.toLocaleDateString("en-GB", {
    timeZone: UK_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeStr = d.toLocaleTimeString("en-GB", {
    timeZone: UK_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dateStr} ${timeStr}`;
}

/** e.g. 6 April 2026 */
export function formatDateLongUK(isoDate: string | Date): string {
  const d =
    typeof isoDate === "string"
      ? new Date(isoDate.slice(0, 10) + "T12:00:00")
      : isoDate;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    timeZone: UK_TIMEZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** e.g. 06 Apr 2026 */
export function formatDateMediumUK(isoDate: string | Date): string {
  const d =
    typeof isoDate === "string"
      ? new Date(isoDate.slice(0, 10) + "T12:00:00")
      : isoDate;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    timeZone: UK_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** YYYY-MM prefix for the given instant in London */
export function londonYearMonthPrefix(ref: Date = new Date()): string {
  const y = new Intl.DateTimeFormat("en-GB", {
    timeZone: UK_TIMEZONE,
    year: "numeric",
  }).format(ref);
  const m = new Intl.DateTimeFormat("en-GB", {
    timeZone: UK_TIMEZONE,
    month: "2-digit",
  }).format(ref);
  return `${y}-${m}`;
}

export function isIsoDateInLondonMonth(
  isoDate: string,
  ref: Date = new Date(),
): boolean {
  const prefix = londonYearMonthPrefix(ref);
  return isoDate.slice(0, 7) === prefix;
}

/** Inclusive YYYY-MM-DD range check (string compare). */
export function isIsoDateInRange(
  isoDate: string,
  from: string,
  to: string,
): boolean {
  const d = isoDate.slice(0, 10);
  return d >= from.slice(0, 10) && d <= to.slice(0, 10);
}

/** First and last calendar day of the current month in Europe/London (YYYY-MM-DD). */
export function londonMonthRangeISO(ref: Date = new Date()): {
  from: string;
  to: string;
} {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: UK_TIMEZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(ref);
  const y = Number(parts.find((p) => p.type === "year")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "month")?.value ?? 1);
  const last = new Date(y, m, 0).getDate();
  const mm = String(m).padStart(2, "0");
  const from = `${y}-${mm}-01`;
  const to = `${y}-${mm}-${String(last).padStart(2, "0")}`;
  return { from, to };
}

/** "Jan 2026" style for YYYY-MM month key */
export function formatMonthLabelUK(ym: string): string {
  const [ys, ms] = ym.split("-");
  if (!ys || !ms) return ym;
  const d = new Date(`${ys}-${ms}-01T12:00:00`);
  if (Number.isNaN(d.getTime())) return ym;
  return d.toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: UK_TIMEZONE,
  });
}

/** Relative calendar-day label using London "today" (for activity lists). */
export function formatRelativeDayLabelUK(
  isoDate: string,
  ref: Date = new Date(),
): string {
  const logDay = isoDate.slice(0, 10);
  const today = todayISOInLondon(ref);
  const logMs = new Date(`${logDay}T12:00:00`).getTime();
  const todayMs = new Date(`${today}T12:00:00`).getTime();
  if (!Number.isFinite(logMs) || !Number.isFinite(todayMs))
    return formatDateMediumUK(isoDate);
  const daysAgo = Math.round((todayMs - logMs) / 86400000);
  if (daysAgo === 0) return "Today";
  if (daysAgo === 1) return "Yesterday";
  if (daysAgo > 1 && daysAgo <= 7) return `${daysAgo} days ago`;
  return formatDateMediumUK(isoDate);
}
