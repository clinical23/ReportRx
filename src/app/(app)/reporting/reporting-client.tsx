"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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

/* ------------------------------------------------------------------ */
/*  Palette                                                            */
/* ------------------------------------------------------------------ */

const CHART_THEMES = [
  {
    id: "category",
    gradient: ["hsl(173 80% 40%)", "hsl(173 80% 28%)"],
    accent: "hsl(173 80% 36%)",
    glow: "hsl(173 80% 60% / 0.25)",
    bg: "hsl(173 60% 97%)",
  },
  {
    id: "clinician",
    gradient: ["hsl(199 89% 52%)", "hsl(199 89% 38%)"],
    accent: "hsl(199 89% 48%)",
    glow: "hsl(199 89% 60% / 0.25)",
    bg: "hsl(199 60% 97%)",
  },
  {
    id: "practice",
    gradient: ["hsl(262 83% 58%)", "hsl(262 83% 44%)"],
    accent: "hsl(262 83% 54%)",
    glow: "hsl(262 83% 64% / 0.25)",
    bg: "hsl(262 60% 97%)",
  },
] as const;

const AXIS_TICK = "hsl(215 16% 57%)";
const GRID_COLOR = "hsl(214 32% 93%)";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function trimLabel(s: string, max = 20) {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function sumField(data: { count: number }[]) {
  return data.reduce((s, d) => s + d.count, 0);
}

/* ------------------------------------------------------------------ */
/*  Custom tooltip                                                     */
/* ------------------------------------------------------------------ */

function ChartTooltip({
  active,
  payload,
  accentColor,
}: {
  active?: boolean;
  payload?: { payload?: { name?: string; count?: number } }[];
  accentColor: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div
      className="rounded-xl border border-slate-200/60 bg-white/90 px-4 py-3 shadow-xl backdrop-blur-md"
      style={{ minWidth: 140 }}
    >
      <p className="mb-1 text-xs font-medium text-slate-500 leading-tight">
        {row.name}
      </p>
      <p className="text-xl font-bold tracking-tight" style={{ color: accentColor }}>
        {(row.count ?? 0).toLocaleString("en-GB")}
      </p>
      <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
        appointments
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  KPI pill                                                           */
/* ------------------------------------------------------------------ */

function KpiRow({
  total,
  count,
  accentColor,
  bg,
}: {
  total: number;
  count: number;
  accentColor: string;
  bg: string;
}) {
  return (
    <div className="flex items-center gap-3 pb-1">
      <span
        className="inline-flex items-baseline gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
        style={{ backgroundColor: bg, color: accentColor }}
      >
        <span className="text-base font-bold tabular-nums">
          {total.toLocaleString("en-GB")}
        </span>
        total
      </span>
      <span className="text-xs text-slate-400">
        across {count} {count === 1 ? "item" : "items"}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sparkline area chart for trend (used inside summary cards)         */
/* ------------------------------------------------------------------ */

type SparkDatum = { label: string; count: number };

function SparkArea({
  data,
  gradientId,
  color,
}: {
  data: SparkDatum[];
  gradientId: string;
  color: string;
}) {
  if (data.length < 2) return null;
  return (
    <div className="h-12 w-full opacity-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="count"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main chart card                                                    */
/* ------------------------------------------------------------------ */

function ChartCard({
  title,
  description,
  data,
  empty,
  theme,
}: {
  title: string;
  description: string;
  data: { name: string; label: string; count: number }[];
  empty: boolean;
  theme: (typeof CHART_THEMES)[number];
}) {
  const total = useMemo(() => sumField(data), [data]);
  const gradId = `bar-grad-${theme.id}`;
  const max = useMemo(
    () => Math.max(...data.map((d) => d.count), 0),
    [data],
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-[15px]">{title}</CardTitle>
            <CardDescription className="mt-0.5">{description}</CardDescription>
          </div>
          {!empty && (
            <SparkArea
              data={data}
              gradientId={`spark-${theme.id}`}
              color={theme.accent}
            />
          )}
        </div>
        {!empty && (
          <KpiRow
            total={total}
            count={data.length}
            accentColor={theme.accent}
            bg={theme.bg}
          />
        )}
      </CardHeader>
      <CardContent className="h-[340px] w-full pt-0">
        {empty ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-slate-400">
              No appointments in this range.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 4, right: 4, left: -8, bottom: 56 }}
              barCategoryGap="18%"
            >
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={theme.gradient[0]} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={theme.gradient[1]} stopOpacity={0.85} />
                </linearGradient>
                <filter id={`glow-${theme.id}`}>
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feFlood floodColor={theme.glow} result="color" />
                  <feComposite in="color" in2="blur" operator="in" result="shadow" />
                  <feMerge>
                    <feMergeNode in="shadow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid
                stroke={GRID_COLOR}
                strokeDasharray="4 4"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: AXIS_TICK, fontWeight: 500 }}
                interval={0}
                angle={-40}
                textAnchor="end"
                height={64}
                tickLine={false}
                axisLine={{ stroke: GRID_COLOR }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: AXIS_TICK, fontWeight: 500 }}
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                cursor={{ fill: theme.glow, radius: 4 }}
                content={<ChartTooltip accentColor={theme.accent} />}
              />
              <Bar
                dataKey="count"
                name="Appointments"
                fill={`url(#${gradId})`}
                radius={[6, 6, 0, 0]}
                maxBarSize={52}
                animationDuration={800}
                animationEasing="ease-out"
                filter={`url(#glow-${theme.id})`}
              >
                {data.map((entry, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fillOpacity={max > 0 ? 0.55 + 0.45 * (entry.count / max) : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

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

  const grandTotal =
    sumField(charts.byCategory) +
    sumField(charts.byClinician) +
    sumField(charts.byPractice);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800">
            Activity
          </h1>
          <p className="mt-1 text-sm font-normal text-slate-500">
            Appointment activity across your PCN
          </p>
        </div>
        {grandTotal > 0 && (
          <p className="text-xs tabular-nums text-slate-400">
            {(grandTotal / 3).toLocaleString("en-GB")} total appointments in
            range
          </p>
        )}
      </div>

      {/* Date range filter */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-[15px]">Date range</CardTitle>
          <CardDescription>
            Defaults to the current calendar month (UK). Apply to refresh.
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
                className="text-xs font-medium text-slate-600"
              >
                From
              </label>
              <input
                id="rep-from"
                name="from"
                type="date"
                required
                defaultValue={initialFrom}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-shadow focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="grid gap-1.5">
              <label
                htmlFor="rep-to"
                className="text-xs font-medium text-slate-600"
              >
                To
              </label>
              <input
                id="rep-to"
                name="to"
                type="date"
                required
                defaultValue={initialTo}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-shadow focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <Button type="submit" className="self-end sm:self-auto">
              Apply range
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-1">
        <ChartCard
          title="Appointments by category"
          description="Breakdown by activity category"
          data={catData}
          empty={charts.byCategory.length === 0}
          theme={CHART_THEMES[0]}
        />
        <ChartCard
          title="Appointments by clinician"
          description="Breakdown by individual clinician"
          data={clinData}
          empty={charts.byClinician.length === 0}
          theme={CHART_THEMES[1]}
        />
        <ChartCard
          title="Appointments by practice"
          description="Breakdown by practice location"
          data={prData}
          empty={charts.byPractice.length === 0}
          theme={CHART_THEMES[2]}
        />
      </div>

      {/* Summary table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[15px]">Summary by month</CardTitle>
          <CardDescription>
            Clinician, practice, month, appointments and hours.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {table.length === 0 ? (
            <div className="flex h-24 items-center justify-center">
              <p className="text-sm text-slate-400">
                No data in this date range.
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-left">
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Clinician
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Practice
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Month
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Appointments
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Hours
                  </th>
                </tr>
              </thead>
              <tbody>
                {table.map((row, i) => (
                  <tr
                    key={`${row.clinician_name}-${row.practice_name}-${row.month_key}-${i}`}
                    className={
                      i % 2 === 0
                        ? "border-b border-slate-100/80 bg-white transition-colors hover:bg-slate-50/60"
                        : "border-b border-slate-100/80 bg-slate-50/40 transition-colors hover:bg-slate-50/80"
                    }
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {row.clinician_name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {row.practice_name}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/activity/day?date=${row.month_key}-01`}
                        className="font-medium text-slate-600 hover:text-primary"
                      >
                        {formatMonthLabelUK(row.month_key)}
                        <span className="ml-1 text-[10px] text-slate-400 group-hover:text-primary">
                          →
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-800">
                      {row.appointments.toLocaleString("en-GB")}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-500">
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
