import { buildMonthlyReportInnerHtml } from "@/lib/report/monthly-report-html-string";
import { loadMonthlyReportViewProps } from "@/lib/report/load-monthly-report";

import { ReportPrintToolbar } from "./print-toolbar";

export const dynamic = "force-dynamic";

export default async function ReportPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string; pcn?: string; practice?: string }>;
}) {
  const sp = await searchParams;
  const props = await loadMonthlyReportViewProps(sp);
  const innerHtml = buildMonthlyReportInnerHtml(props);

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <ReportPrintToolbar />
      <div dangerouslySetInnerHTML={{ __html: innerHtml }} />
    </div>
  );
}
