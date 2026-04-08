import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Calendar, Clock, FileText, Users } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateLongUK } from "@/lib/datetime";
import { getDailyBreakdown } from "@/lib/supabase/activity";
import { getAuthProfile, isAppRole } from "@/lib/supabase/auth-profile";
import { getPracticeScopeIdsForSession } from "@/lib/supabase/practice-scope";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ date?: string }>;
};

export default async function DailyBreakdownPage({ searchParams }: Props) {
  const params = await searchParams;
  const date = params.date;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    redirect("/activity");
  }

  const session = await getAuthProfile();
  if (!session?.user) redirect("/login");

  const profile = session.profile;
  const role = profile && isAppRole(profile.role) ? profile.role : null;
  const isClinician = role === "clinician";

  const scope = await getPracticeScopeIdsForSession(session);

  // Clinicians see only their own entries
  const clinicianId = isClinician ? profile?.clinician_id ?? null : null;

  const rows = await getDailyBreakdown(date, scope, clinicianId);

  // Aggregate stats
  const totalAppointments = rows.reduce((s, r) => s + r.appointment_count, 0);
  const uniqueLogs = new Set(rows.map((r) => r.log_id));
  const uniqueClinicians = new Set(rows.map((r) => r.clinician_name));

  const hoursByLog = new Map<string, number>();
  for (const r of rows) {
    if (r.log_id && r.hours_worked != null) {
      hoursByLog.set(r.log_id, r.hours_worked);
    }
  }
  let totalHours = 0;
  for (const h of hoursByLog.values()) totalHours += h;
  totalHours = Math.round(totalHours * 10) / 10;

  // Group by clinician → practice → categories
  type ClinGroup = {
    clinician: string;
    practices: Map<
      string,
      { categories: { name: string; count: number }[]; hours: number }
    >;
    total: number;
  };

  const clinMap = new Map<string, ClinGroup>();

  for (const r of rows) {
    const cname = r.clinician_name || "—";
    if (!clinMap.has(cname)) {
      clinMap.set(cname, { clinician: cname, practices: new Map(), total: 0 });
    }
    const cg = clinMap.get(cname)!;
    cg.total += r.appointment_count;

    const pname = r.practice_name || "—";
    if (!cg.practices.has(pname)) {
      cg.practices.set(pname, { categories: [], hours: 0 });
    }
    const pg = cg.practices.get(pname)!;
    pg.categories.push({
      name: r.category_name || "Uncategorised",
      count: r.appointment_count,
    });
    if (r.hours_worked != null) {
      pg.hours = Math.round(r.hours_worked * 10) / 10;
    }
  }

  // Sort clinicians by total desc
  const clinGroups = [...clinMap.values()].sort((a, b) => b.total - a.total);

  const dateLabel = formatDateLongUK(date);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Back to dashboard
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-800">
          Daily breakdown
        </h1>
        <p className="mt-1 text-sm text-slate-500">{dateLabel}</p>
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat
          icon={Calendar}
          label="Appointments"
          value={totalAppointments.toLocaleString("en-GB")}
          accent="teal"
        />
        <MiniStat
          icon={Clock}
          label="Hours"
          value={totalHours > 0 ? `${totalHours}h` : "—"}
          accent="blue"
        />
        <MiniStat
          icon={FileText}
          label="Log entries"
          value={String(uniqueLogs.size)}
          accent="violet"
        />
        {!isClinician && (
          <MiniStat
            icon={Users}
            label="Clinicians"
            value={String(uniqueClinicians.size)}
            accent="amber"
          />
        )}
      </div>

      {/* Main breakdown */}
      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-slate-400">
              No activity recorded for {dateLabel}.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {clinGroups.map((cg) => (
            <Card key={cg.clinician} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-[15px]">
                      {cg.clinician}
                    </CardTitle>
                    <CardDescription>
                      {cg.total.toLocaleString("en-GB")} appointment
                      {cg.total !== 1 ? "s" : ""} across{" "}
                      {cg.practices.size} practice
                      {cg.practices.size !== 1 ? "s" : ""}
                    </CardDescription>
                  </div>
                  <span className="inline-flex rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-teal-700 ring-1 ring-teal-200/70">
                    {cg.total}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-left">
                        <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Practice
                        </th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Category
                        </th>
                        <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Appointments
                        </th>
                        <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Hours
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...cg.practices.entries()].map(
                        ([pname, pg], pIdx) =>
                          pg.categories.map((cat, cIdx) => (
                            <tr
                              key={`${pname}-${cat.name}-${cIdx}`}
                              className={cn(
                                "border-b border-slate-100/80 transition-colors hover:bg-slate-50/60",
                                (pIdx + cIdx) % 2 === 0
                                  ? "bg-white"
                                  : "bg-slate-50/30",
                              )}
                            >
                              {cIdx === 0 ? (
                                <td
                                  className="px-4 py-2.5 font-medium text-slate-700"
                                  rowSpan={pg.categories.length}
                                >
                                  {pname}
                                </td>
                              ) : null}
                              <td className="px-4 py-2.5 text-slate-600">
                                <span className="inline-flex items-center gap-1.5">
                                  <span className="size-1.5 rounded-full bg-teal-400" />
                                  {cat.name}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-right tabular-nums font-medium text-slate-800">
                                {cat.count.toLocaleString("en-GB")}
                              </td>
                              {cIdx === 0 ? (
                                <td
                                  className="px-4 py-2.5 text-right tabular-nums text-slate-500"
                                  rowSpan={pg.categories.length}
                                >
                                  {pg.hours > 0 ? `${pg.hours}h` : "—"}
                                </td>
                              ) : null}
                            </tr>
                          )),
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
  accent: "teal" | "blue" | "violet" | "amber";
}) {
  const colors = {
    teal: "border-l-teal-500 bg-teal-50/40",
    blue: "border-l-blue-500 bg-blue-50/40",
    violet: "border-l-violet-500 bg-violet-50/40",
    amber: "border-l-amber-500 bg-amber-50/40",
  } as const;
  const iconColors = {
    teal: "text-teal-600",
    blue: "text-blue-600",
    violet: "text-violet-600",
    amber: "text-amber-600",
  } as const;

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 border-l-4 p-4 shadow-sm",
        colors[accent],
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn("size-4", iconColors[accent])} aria-hidden />
        <span className="text-xs font-medium text-slate-500">{label}</span>
      </div>
      <p className="mt-1.5 text-xl font-bold tabular-nums tracking-tight text-slate-800">
        {value}
      </p>
    </div>
  );
}
