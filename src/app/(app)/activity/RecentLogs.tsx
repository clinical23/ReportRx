import {
  Card,
  CardContent,
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
        <CardTitle className="text-base">Recent entries</CardTitle>
      </CardHeader>
      <CardContent className="p-0 sm:p-0">
        <div className="overflow-x-auto rounded-b-xl">
          <ul className="divide-y divide-slate-100">
            {logs.map((log, i) => {
              const appointmentTotal = log.entries.reduce(
                (s, e) => s + e.count,
                0
              );
              const categoryLabel =
                log.entries.length > 0
                  ? log.entries
                      .map((e) =>
                        e.count > 1
                          ? `${e.category_name} (${e.count})`
                          : e.category_name
                      )
                      .join(" · ")
                  : "Uncategorised";

              return (
                <li
                  key={log.log_id}
                  className={cn(
                    "flex flex-col gap-2 px-6 py-4 text-sm sm:flex-row sm:items-center sm:justify-between",
                    i % 2 === 0 ? "bg-white" : "bg-slate-50/70"
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
                  <div className="shrink-0 text-left sm:text-right">
                    <div className="font-medium text-slate-800">
                      {formatRelativeDayLabelUK(log.log_date)}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatDateMediumUK(log.log_date)}
                    </div>
                    <div className="mt-1 text-xs tabular-nums text-slate-600">
                      {appointmentTotal} appts
                      {log.hours_worked != null && log.hours_worked > 0
                        ? ` · ${log.hours_worked} hrs`
                        : ""}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
