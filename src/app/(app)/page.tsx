import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDashboardSnapshot } from "@/lib/supabase/activity";
import { getAuthProfile } from "@/lib/supabase/auth-profile";
import { getPracticeScopeIdsForSession } from "@/lib/supabase/practice-scope";
import { formatDateMediumUK } from "@/lib/datetime";

export const dynamic = "force-dynamic";

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
    },
    {
      label: "Active clinicians this month",
      value: String(snap.activeCliniciansThisMonth),
      hint: "Clinicians with at least one log entry this month",
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
    },
    {
      label: "Entries logged this month",
      value: String(snap.entriesThisMonth),
      hint: "Distinct activity log submissions",
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
        {row1.map((m) => (
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

      <div className="grid gap-4 sm:grid-cols-3">
        {row2.map((m) => (
          <Card key={m.label}>
            <CardHeader className="pb-2">
              <CardDescription>{m.label}</CardDescription>
              <CardTitle className="text-2xl font-semibold tracking-tight text-foreground">
                {m.value}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{m.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
          <CardDescription>
            Latest activity log entries (appointments summed per submission).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {snap.recentEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No activity logged yet this month.
            </p>
          ) : (
            <div className="space-y-3">
              {snap.recentEntries.map((e) => (
                <div
                  key={e.log_id}
                  className="flex flex-col gap-1 border-b border-border pb-3 text-sm last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {e.clinician_name || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {e.practice_name || "—"}
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground sm:text-sm">
                    <div>{formatDateMediumUK(e.log_date)}</div>
                    <div className="tabular-nums">
                      {e.appointment_total.toLocaleString("en-GB")} appointments
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
