import { londonMonthRangeISO } from "@/lib/datetime";
import {
  getReportingChartsData,
  getReportingTable,
} from "@/lib/supabase/activity";
import { getAuthProfile } from "@/lib/supabase/auth-profile";
import { getPracticeScopeIdsForSession } from "@/lib/supabase/practice-scope";

import { ReportingLoader } from "./reporting-loader";

export const dynamic = "force-dynamic";

export default async function ReportingPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const def = londonMonthRangeISO();
  const rawFrom = sp.from?.slice(0, 10);
  const rawTo = sp.to?.slice(0, 10);
  let from = rawFrom && rawFrom.length === 10 ? rawFrom : def.from;
  let to = rawTo && rawTo.length === 10 ? rawTo : def.to;
  if (from > to) {
    const t = from;
    from = to;
    to = t;
  }

  const session = await getAuthProfile();
  const scope = await getPracticeScopeIdsForSession(session);

  const [charts, table] = await Promise.all([
    getReportingChartsData(from, to, scope),
    getReportingTable(from, to, scope),
  ]);

  return (
    <ReportingLoader
      initialFrom={from}
      initialTo={to}
      charts={charts}
      table={table}
    />
  );
}
