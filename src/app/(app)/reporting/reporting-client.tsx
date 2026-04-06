"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  ReportingChartsData,
  ReportingTableRow,
} from "@/lib/supabase/activity";
import { formatMonthLabelUK } from "@/lib/datetime";

const BAR_FILL = "hsl(221, 83%, 53%)";
const GRID = "hsl(214, 32%, 91%)";

function trimLabel(s: string, max = 24) {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

type Props = {
  initialFrom: string;
  initialTo: string;
  charts: ReportingChartsData;
  table: ReportingTableRow[];
};

export function ReportingClient({
  initialFrom,
  initialTo,
  charts,
  table,
}: Props) {
  const catData = charts.byCategory.map((d) => ({
    ...d,
    label: trimLabel(d.name),
  }));
  const clinData = charts.byClinician.map((d) => ({
    ...d,
    label: trimLabel(d.name),
  }));
  const prData = charts.byPractice.map((d) => ({
    ...d,
    label: trimLabel(d.name),
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Reporting
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Appointment activity across your PCN
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Date range</CardTitle>
          <CardDescription>
            Defaults to the current calendar month (UK). Apply to refresh charts
            and the summary table.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action="/reporting"
            method="get"
            className="flex flex-wrap items-end gap-3"
          >
            <div className="grid gap-1.5">
              <label
                htmlFor="rep-from"
                className="text-xs font-medium text-muted-foreground"
              >
                From
              </label>
              <input
                id="rep-from"
                name="from"
                type="date"
                required
                defaultValue={initialFrom}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="grid gap-1.5">
              <label
                htmlFor="rep-to"
                className="text-xs font-medium text-muted-foreground"
              >
                To
              </label>
              <input
                id="rep-to"
                name="to"
                type="date"
                required
                defaultValue={initialTo}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <Button type="submit">Apply range</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-1">
        <ChartCard
          title="Appointments by category"
          description="Total appointments in range, by category"
          data={catData}
          empty={charts.byCategory.length === 0}
        />
        <ChartCard
          title="Appointments by clinician"
          description="Total appointments in range, by clinician"
          data={clinData}
          empty={charts.byClinician.length === 0}
        />
        <ChartCard
          title="Appointments by practice"
          description="Total appointments in range, by practice"
          data={prData}
          empty={charts.byPractice.length === 0}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summary by month</CardTitle>
          <CardDescription>
            Clinician, practice, month, appointments and hours (hours counted once
            per log entry).
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {table.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No data in this date range.
            </p>
          ) : (
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th className="px-3 py-2 font-medium text-muted-foreground">
                    Clinician
                  </th>
                  <th className="px-3 py-2 font-medium text-muted-foreground">
                    Practice
                  </th>
                  <th className="px-3 py-2 font-medium text-muted-foreground">
                    Month
                  </th>
                  <th className="px-3 py-2 font-medium text-muted-foreground">
                    Appointments
                  </th>
                  <th className="px-3 py-2 font-medium text-muted-foreground">
                    Hours
                  </th>
                </tr>
              </thead>
              <tbody>
                {table.map((row, i) => (
                  <tr
                    key={`${row.clinician_name}-${row.practice_name}-${row.month_key}-${i}`}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-3 py-2 font-medium text-foreground">
                      {row.clinician_name}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.practice_name}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {formatMonthLabelUK(row.month_key)}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-foreground">
                      {row.appointments.toLocaleString("en-GB")}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">
                      {row.hours > 0
                        ? row.hours.toLocaleString("en-GB", {
                            maximumFractionDigits: 1,
                          })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ChartCard({
  title,
  description,
  data,
  empty,
}: {
  title: string;
  description: string;
  data: { name: string; label: string; count: number }[];
  empty: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="h-[320px] w-full pt-2">
        {empty ? (
          <p className="text-sm text-muted-foreground">
            No appointments in this range.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 8, left: 0, bottom: 64 }}
            >
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "hsl(215, 16%, 47%)" }}
                interval={0}
                angle={-35}
                textAnchor="end"
                height={70}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(215, 16%, 47%)" }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "0.375rem",
                  border: "1px solid hsl(214, 32%, 91%)",
                  fontSize: "12px",
                }}
                formatter={(value) => {
                  const n =
                    typeof value === "number"
                      ? value
                      : Number(value);
                  return [
                    Number.isFinite(n) ? n.toLocaleString("en-GB") : "0",
                    "Appointments",
                  ];
                }}
                labelFormatter={(_label, payload) => {
                  const row = payload?.[0]?.payload as
                    | { name?: string }
                    | undefined;
                  return row?.name ?? "";
                }}
              />
              <Bar
                dataKey="count"
                name="Appointments"
                fill={BAR_FILL}
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
