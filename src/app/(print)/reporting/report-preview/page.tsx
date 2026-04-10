import { logAudit } from "@/lib/audit";
import { buildMonthlyReportInnerHtml } from "@/lib/report/monthly-report-html-string";
import {
  loadMonthlyReportViewProps,
  resolveReportDateRange,
} from "@/lib/report/load-monthly-report";
import { createClient } from "@/lib/supabase/server";

import { ReportPrintToolbar } from "./print-toolbar";

export const dynamic = "force-dynamic";

export default async function ReportPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string; pcn?: string; practice?: string }>;
}) {
  const sp = await searchParams;
  const props = await loadMonthlyReportViewProps(sp);
  const { safeStart, safeEnd } = resolveReportDateRange(sp);
  const supabase = await createClient();
  logAudit({
    supabase,
    action: "export",
    resourceType: "reporting",
    metadata: {
      format: "pdf",
      dateRange: { from: safeStart, to: safeEnd },
      pcnId: sp.pcn?.trim() || undefined,
      practiceId: sp.practice?.trim() || undefined,
    },
  });
  const innerHtml = buildMonthlyReportInnerHtml(props);

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <ReportPrintToolbar />
      <div dangerouslySetInnerHTML={{ __html: innerHtml }} />
    </div>
  );
}
