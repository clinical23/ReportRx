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

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatDateMediumUK,
  formatRelativeDayLabelUK,
  todayISOInLondon,
} from "@/lib/datetime";
import { getDashboardSnapshot } from "@/lib/supabase/activity";
import { getAuthProfile } from "@/lib/supabase/auth-profile";
import { getPracticeScopeIdsForSession } from "@/lib/supabase/practice-scope";
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
        "relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm",
        "border-l-4 pl-5",
        borders[accent],
        href &&
          "transition-all duration-150 hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5 cursor-pointer",
      )}
    >
      <div className="absolute right-4 top-4 opacity-80">
        <Icon className={cn("size-5", iconTones[accent])} aria-hidden />
      </div>
      <p className="pr-10 text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-slate-800">
        {value}
      </p>
      <p className="mt-3 text-sm font-normal text-slate-600">{hint}</p>
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

export default async function DashboardPage() {
  const session = await getAuthProfile();
  const scope = await getPracticeScopeIdsForSession(session);
  const snap = await getDashboardSnapshot(scope);

  const firstName =
    session?.profile?.full_name?.trim().split(/\s+/)[0] ??
    session?.user.email?.split("@")[0] ??
    "there";

  const row1 = [
    {
      label: "Appointments this month",
      value: snap.appointmentsThisMonth.toLocaleString("en-GB"),
      hint: "From activity logs (UK calendar month)",
      icon: Calendar,
      accent: "teal" as const,
      href: "/activity",
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
      href: "/activity",
    },
    {
      label: "Active clinicians this month",
      value: String(snap.activeCliniciansThisMonth),
      hint: "Clinicians with at least one log entry this month",
      icon: Users,
      accent: "violet" as const,
      href: "/clinicians",
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
      href: `/activity/day?date=${todayISOInLondon()}`,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-teal-50 via-white to-slate-50/80 p-6 shadow-sm sm:p-8">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 sm:text-3xl">
            Welcome back, {firstName}
          </h1>
          <p className="mt-2 text-sm font-normal text-slate-600">
            Here is an overview of your practice at a glance.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {row1.map((m) => (
          <StatTile key={m.label} {...m} />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {row2.map((m) => (
          <StatTile key={m.label} {...m} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base">Recent activity</CardTitle>
              <CardDescription>
                Latest activity log entries (appointments summed per
                submission).
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
            <p className="text-sm text-slate-600">
              No activity logged yet this month.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[36rem] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100 text-left">
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Clinician
                    </th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Practice
                    </th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                      When
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                      Appointments
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {snap.recentEntries.map((e, i) => (
                    <tr
                      key={e.log_id}
                      className={cn(
                        "border-b border-slate-100 last:border-0 transition-colors hover:bg-teal-50/40 cursor-pointer",
                        i % 2 === 0 ? "bg-white" : "bg-slate-50/80",
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
