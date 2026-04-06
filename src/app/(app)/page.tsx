import { ArrowUpRight, FileText, Users } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDashboardActivityStats } from "@/lib/supabase/activity";
import { getAuthProfile } from "@/lib/supabase/auth-profile";
import {
  computeTaskBatchMetrics,
  getClinicians,
  getTasks,
} from "@/lib/supabase/data";
import { formatDueLabel } from "@/lib/supabase/task-batch-ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [session, activityStats, batches, clinicians] = await Promise.all([
    getAuthProfile(),
    getDashboardActivityStats(),
    getTasks(),
    getClinicians(),
  ]);

  const firstName =
    session?.profile?.full_name?.trim().split(/\s+/)[0] ??
    session?.user.email?.split("@")[0] ??
    "there";

  const metrics = computeTaskBatchMetrics(batches);
  const completionLabel =
    metrics.totalTasks > 0
      ? `${metrics.completionRate}% completion rate`
      : "No tasks tracked yet";

  const recentBatches = [...batches].sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );

  const topClinicians = [...clinicians]
    .sort((a, b) => b.active_caseload - a.active_caseload)
    .slice(0, 3);

  const summaryCards = [
    {
      label: "Appointments logged (this month)",
      value: activityStats.appointmentsThisMonth.toLocaleString("en-GB"),
      hint: "From activity logs (UK month)",
    },
    {
      label: "Hours logged (this month)",
      value:
        activityStats.hoursThisMonth > 0
          ? `${activityStats.hoursThisMonth.toLocaleString("en-GB", {
              maximumFractionDigits: 1,
            })}h`
          : "—",
      hint: "Unique activity logs in the UK calendar month",
    },
    {
      label: "Active clinicians",
      value: String(activityStats.activeCliniciansThisMonth),
      hint:
        activityStats.activeCliniciansThisMonth > 0
          ? "Distinct clinicians with activity logged this month (UK)"
          : "No activity logged for clinicians this month yet",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here is an overview of your practice at a glance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {summaryCards.map((m) => (
          <Card key={m.label}>
            <CardHeader className="pb-2">
              <CardDescription>{m.label}</CardDescription>
              <CardTitle className="text-3xl font-semibold tabular-nums text-foreground">
                {m.value}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{m.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-foreground">
          Operations
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Tasks completed</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums">
                {metrics.totalTasks > 0 ? String(metrics.completedTasks) : "—"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={
                  metrics.completionRate >= 50 || metrics.totalTasks === 0
                    ? "text-sm font-medium text-success"
                    : "text-sm text-muted-foreground"
                }
              >
                {completionLabel}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Open tasks</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums">
                {metrics.totalTasks > 0 ? String(metrics.openTasks) : "—"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {metrics.openTasks > 0
                  ? "Remaining across all batches"
                  : "All batches complete or empty"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Task batches</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums">
                {batches.length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Active batches</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground" />
              <CardTitle className="text-base">Recent activity</CardTitle>
            </div>
            <CardDescription>Latest updates from task batches.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentBatches.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No task batches recorded yet.
              </p>
            ) : (
              recentBatches.slice(0, 5).map((batch) => (
                <div
                  key={batch.id}
                  className="flex items-center justify-between border-b border-border pb-3 text-sm last:border-0 last:pb-0"
                >
                  <span className="text-foreground">
                    {batch.title} — {batch.completed_tasks}/{batch.total_tasks}{" "}
                    done · due {formatDueLabel(batch.due_at)}
                  </span>
                  <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              <CardTitle className="text-base">Team snapshot</CardTitle>
            </div>
            <CardDescription>
              Clinicians by active caseload (top three).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topClinicians.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No clinicians yet. Add one from the Clinicians page.
              </p>
            ) : (
              topClinicians.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{row.name}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {row.active_caseload} active
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
