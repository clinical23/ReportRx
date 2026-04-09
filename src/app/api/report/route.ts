import { buildMonthlyReportApiDocumentHtml } from "@/lib/report/monthly-report-html-string";
import { loadMonthlyReportViewProps } from "@/lib/report/load-monthly-report";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start") ?? undefined;
  const end = searchParams.get("end") ?? undefined;

  const props = await loadMonthlyReportViewProps({ start, end });
  const html = buildMonthlyReportApiDocumentHtml(props);

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}
