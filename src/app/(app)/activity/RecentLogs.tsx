import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateMediumUK, formatRelativeDayLabelUK } from "@/lib/datetime";

export type GroupedRecentLog = {
  log_id: string;
  log_date: string;
  hours_worked: number | null;
  clinician_name: string;
  practice_name: string;
  entries: { category_name: string; count: number }[];
};

export default function RecentLogs({ logs }: { logs: GroupedRecentLog[] }) {
  if (!logs.length) {
    return (
      <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">Recent entries</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">No activity logged yet.</p>
        </CardContent>
      </Card>
    );
  }

  const totalAppointments = logs.reduce(
    (sum, log) =>
      sum + log.entries.reduce((s, e) => s + e.count, 0),
    0,
  );
  const uniqueClinicians = new Set(
    logs.map((l) => l.clinician_name).filter(Boolean),
  ).size;
  const uniqueDays = new Set(logs.map((l) => l.log_date.slice(0, 10))).size;

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
        <ul className="flex min-w-0 flex-col gap-3">
          {logs.map((log) => {
            const appointmentTotal = log.entries.reduce(
              (s, e) => s + e.count,
              0,
            );
            const categoryLabel =
              log.entries.length > 0
                ? log.entries
                    .map((e) =>
                      e.count > 1
                        ? `${e.category_name} (${e.count})`
                        : e.category_name,
                    )
                    .join(" · ")
                : "Uncategorised";

            return (
              <li key={log.log_id} className="min-w-0">
                <Link
                  href={`/activity/day?date=${log.log_date.slice(0, 10)}`}
                  className="block w-full min-w-0 rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm transition-colors hover:border-teal-200 hover:bg-teal-50/30"
                >
                  <div className="min-w-0 font-medium text-gray-900">
                    {categoryLabel}
                  </div>
                  <div className="mt-1 min-w-0 text-xs text-gray-500">
                    {log.clinician_name || "Unknown clinician"}
                    {log.practice_name ? ` · ${log.practice_name}` : ""}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
                    <div>
                      <div className="font-medium text-gray-900">
                        {formatRelativeDayLabelUK(log.log_date)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDateMediumUK(log.log_date)}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold tabular-nums text-teal-700 ring-1 ring-teal-200/70">
                        {appointmentTotal} appt
                        {appointmentTotal !== 1 ? "s" : ""}
                      </span>
                      {log.hours_worked != null && log.hours_worked > 0 ? (
                        <span className="text-xs tabular-nums text-gray-400">
                          {log.hours_worked}h
                        </span>
                      ) : null}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
