"use client";

import dynamic from "next/dynamic";

import type {
  ReportingChartsData,
  ReportingTableRow,
} from "@/lib/supabase/activity";

const ReportingClient = dynamic(
  () => import("./reporting-client").then((m) => m.ReportingClient),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto max-w-6xl space-y-4 p-6 text-sm text-muted-foreground">
        Loading charts…
      </div>
    ),
  },
);

type Props = {
  initialFrom: string;
  initialTo: string;
  charts: ReportingChartsData;
  table: ReportingTableRow[];
};

export function ReportingLoader(props: Props) {
  return <ReportingClient {...props} />;
}
