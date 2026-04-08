import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateMediumUK, formatRelativeDayLabelUK } from "@/lib/datetime";
import { cn } from "@/lib/utils";

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
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent entries</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">No activity logged yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">Recent entries</CardTitle>
            <CardDescription>
              Click any entry to see the full daily breakdown.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 sm:p-0">
        <div className="overflow-x-auto rounded-b-xl">
          <ul className="divide-y divide-slate-100">
            {logs.map((log, i) => {
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
                <li key={log.log_id}>
                  <Link
                    href={`/activity/day?date=${log.log_date.slice(0, 10)}`}
                    className={cn(
                      "flex flex-col gap-2 px-6 py-4 text-sm transition-colors hover:bg-teal-50/50 sm:flex-row sm:items-center sm:justify-between",
                      i % 2 === 0 ? "bg-white" : "bg-slate-50/70",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-800">
                        {categoryLabel}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {log.clinician_name || "Unknown clinician"}
                        {log.practice_name ? ` · ${log.practice_name}` : ""}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-4 text-left sm:text-right">
                      <div>
                        <div className="font-medium text-slate-800">
                          {formatRelativeDayLabelUK(log.log_date)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatDateMediumUK(log.log_date)}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="inline-flex rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-teal-700 ring-1 ring-teal-200/70">
                          {appointmentTotal} appt{appointmentTotal !== 1 ? "s" : ""}
                        </span>
                        {log.hours_worked != null && log.hours_worked > 0 ? (
                          <span className="text-[11px] tabular-nums text-slate-400">
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
        </div>
      </CardContent>
    </Card>
  );
}
