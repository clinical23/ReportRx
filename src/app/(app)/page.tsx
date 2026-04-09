import Link from "next/link";
import {
  Building2,
  Calendar,
  Clock,
  FileStack,
  LucideIcon,
  Tag,
  Users,
} from "lucide-react";

import { PersonalCategoryChart } from "@/components/dashboard/personal-category-chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  formatDateMediumUK,
  formatMonthLabelUK,
  formatRelativeDayLabelUK,
  londonMonthRangeISO,
} from "@/lib/datetime";
import { getDashboardSnapshot } from "@/lib/supabase/activity";
import { getProfile } from "@/lib/supabase/auth";
import { getAuthProfile } from "@/lib/supabase/auth-profile";
import { getPracticeScopeIdsForSession } from "@/lib/supabase/practice-scope";
import {
  getMyCategoryBreakdown,
  getMyRecentLogs,
  getMyStats,
} from "@/lib/supabase/reporting";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  href,
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  accent: "teal" | "blue" | "violet" | "amber" | "rose" | "emerald";
  href?: string;
}) {
  const borders = {
    teal: "border-l-teal-500",
    blue: "border-l-blue-500",
    violet: "border-l-violet-500",
    amber: "border-l-amber-500",
    rose: "border-l-rose-500",
    emerald: "border-l-emerald-500",
  } as const;
  const iconTones = {
    teal: "text-teal-600",
    blue: "text-blue-600",
    violet: "text-violet-600",
    amber: "text-amber-600",
    rose: "text-rose-600",
    emerald: "text-emerald-600",
  } as const;

  const content = (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6",
        "border-l-4 pl-4 sm:pl-5",
        borders[accent],
        href &&
          "cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md",
      )}
    >
      <div className="absolute right-4 top-4 opacity-80">
        <Icon className={cn("size-5", iconTones[accent])} aria-hidden />
      </div>
      <p className="pr-10 text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-gray-900">
        {value}
      </p>
      <p className="mt-3 text-sm text-gray-600">{hint}</p>
      {href && (
        <span className="mt-2 inline-block text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
          View details →
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="group">
        {content}
      </Link>
    );
  }
  return content;
}

function myClinicianKeys(profile: {
  id: string;
  clinician_id: string | null;
}): string[] {
  return [
    ...new Set(
      [profile.id, profile.clinician_id].filter((x): x is string => Boolean(x)),
    ),
  ];
}

export default async function DashboardPage() {
  const profile = await getProfile();

  const firstName =
    profile.full_name?.trim().split(/\s+/)[0] ??
    profile.email?.split("@")[0] ??
    "there";

  if (profile.role === "clinician") {
    const { from, to } = londonMonthRangeISO();
    const monthLabel = formatMonthLabelUK(from.slice(0, 7));
    const keys = myClinicianKeys(profile);

    const [myStats, myCategories, myRecent] = await Promise.all([
      getMyStats(keys, from, to),
      getMyCategoryBreakdown(keys, from, to),
      getMyRecentLogs(10, keys),
    ]);

    const personalKpis = [
      {
        label: "My total appointments",
        value: myStats.totalAppointments.toLocaleString("en-GB"),
        hint: `In ${monthLabel} (all practices)`,
        icon: Calendar,
        accent: "teal" as const,
      },
      {
        label: "My hours logged",
        value:
          myStats.totalHours > 0
            ? `${myStats.totalHours.toLocaleString("en-GB", {
                maximumFractionDigits: 1,
              })}h`
            : "—",
        hint: "From your activity logs this month",
        icon: Clock,
        accent: "blue" as const,
      },
      {
        label: "Practices I covered",
        value: String(myStats.practicesCovered),
        hint: "Distinct practices in your logs",
        icon: Building2,
        accent: "violet" as const,
      },
      {
        label: "Days logged this month",
        value: String(myStats.daysLogged),
        hint: "Distinct calendar days with a log",
        icon: FileStack,
        accent: "emerald" as const,
      },
    ];

    return (
      <div className="mx-auto min-w-0 max-w-6xl space-y-8">
        <div className="relative w-full overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-teal-50 via-white to-gray-50/80 p-4 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl">
                My Activity This Month
              </h1>
              <p className="mt-2 text-sm text-gray-500">
                Welcome back, {firstName}. Here&apos;s your personal summary for{" "}
                {monthLabel}.
              </p>
            </div>
            <Button
              asChild
              className="h-11 shrink-0 bg-teal-600 px-6 text-base font-medium text-white shadow-sm hover:bg-teal-700 sm:h-12"
            >
              <Link href="/activity">Log Today&apos;s Activity</Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {personalKpis.map((m) => (
            <StatTile key={m.label} {...m} />
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">My appointments by category</CardTitle>
            <CardDescription>
              Total appointments logged this month, split by category.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PersonalCategoryChart data={myCategories} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <CardTitle className="text-base">My recent logs</CardTitle>
                <CardDescription>Your last ten activity submissions.</CardDescription>
              </div>
              {myRecent.length > 0 && (
                <Link
                  href="/activity"
                  className="shrink-0 text-xs font-medium text-teal-700 hover:underline"
                >
                  View all →
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {myRecent.length === 0 ? (
              <p className="text-sm text-gray-600">
                You haven&apos;t logged activity this month yet.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {myRecent.map((log, idx) => (
                  <div
                    key={`${log.log_date}-${log.practice_name}-${idx}`}
                    className="rounded-xl border border-gray-100 bg-white px-3 py-3 shadow-sm"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900">
                        {log.practice_name}
                      </p>
                      <Link
                        href={`/activity/day?date=${log.log_date.slice(0, 10)}`}
                        className="text-xs text-teal-700 hover:underline"
                      >
                        {formatRelativeDayLabelUK(log.log_date)} ·{" "}
                        {formatDateMediumUK(log.log_date)}
                      </Link>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {log.hours_worked}h ·{" "}
                      {log.categories.map((c) => `${c.name} × ${c.count}`).join(" · ")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  /* Team dashboard: managers, admins, superadmins */
  const session = await getAuthProfile();
  const scope = await getPracticeScopeIdsForSession(session);
  const snap = await getDashboardSnapshot(scope);

  const row1 = [
    {
      label: "Appointments this month",
      value: snap.appointmentsThisMonth.toLocaleString("en-GB"),
      hint: "From activity logs (UK calendar month)",
      icon: Calendar,
      accent: "teal" as const,
      href: "/reporting",
    },
    {
      label: "Hours logged this month",
      value:
        snap.hoursThisMonth > 0
          ? `${snap.hoursThisMonth.toLocaleString("en-GB", {
              maximumFractionDigits: 1,
            })}h`
          : "—",
      hint: "Unique activity logs in the UK calendar month",
      icon: Clock,
      accent: "blue" as const,
      href: "/reporting",
    },
    {
      label: "Active clinicians this month",
      value: String(snap.activeCliniciansThisMonth),
      hint: "Clinicians with at least one log entry this month",
      icon: Users,
      accent: "violet" as const,
      href: "/reporting",
    },
  ];

  const row2 = [
    {
      label: "Top category this month",
      value:
        snap.topCategoryAppointments > 0 && snap.topCategoryName
          ? snap.topCategoryName
          : "—",
      hint:
        snap.topCategoryAppointments > 0
          ? `${snap.topCategoryAppointments.toLocaleString("en-GB")} appointments`
          : "No category data yet",
      icon: Tag,
      accent: "amber" as const,
      href: "/reporting",
    },
    {
      label: "Most active practice this month",
      value:
        snap.topPracticeAppointments > 0 && snap.topPracticeName
          ? snap.topPracticeName
          : "—",
      hint:
        snap.topPracticeAppointments > 0
          ? `${snap.topPracticeAppointments.toLocaleString("en-GB")} appointments`
          : "No practice data yet",
      icon: Building2,
      accent: "rose" as const,
      href: "/reporting",
    },
    {
      label: "Entries logged this month",
      value: String(snap.entriesThisMonth),
      hint: "Distinct activity log submissions",
      icon: FileStack,
      accent: "emerald" as const,
      href: "/reporting",
    },
  ];

  return (
    <div className="mx-auto min-w-0 max-w-6xl space-y-8">
      <div className="relative w-full overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-teal-50 via-white to-gray-50/80 p-4 shadow-sm sm:p-8">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Welcome back, {firstName}. Here is an overview of your practice at a
            glance.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...row1, ...row2].map((m) => (
          <StatTile key={m.label} {...m} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="text-base">Recent activity</CardTitle>
              <CardDescription>
                Latest activity log entries (appointments summed per submission).
              </CardDescription>
            </div>
            {snap.recentEntries.length > 0 && (
              <Link
                href="/activity"
                className="shrink-0 text-xs font-medium text-primary hover:underline"
              >
                View all →
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {snap.recentEntries.length === 0 ? (
            <p className="text-sm text-gray-600">
              No activity logged yet this month.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full min-w-[36rem] text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left">
                    <th className="px-4 py-3 text-sm font-medium text-gray-500">
                      Clinician
                    </th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-500">
                      Practice
                    </th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-500">
                      When
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                      Appointments
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {snap.recentEntries.map((e, i) => (
                    <tr
                      key={e.log_id}
                      className={cn(
                        "cursor-pointer border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50",
                        i % 2 === 0 ? "bg-white" : "bg-gray-50/50",
                      )}
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {e.clinician_name || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {e.practice_name || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/activity/day?date=${e.log_date.slice(0, 10)}`}
                          className="group/date"
                        >
                          <span className="font-medium text-slate-800 group-hover/date:text-primary">
                            {formatRelativeDayLabelUK(e.log_date)}
                          </span>
                          <span className="mt-0.5 block text-xs text-slate-500 group-hover/date:text-primary/70">
                            {formatDateMediumUK(e.log_date)}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-800">
                        {e.appointment_total.toLocaleString("en-GB")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
