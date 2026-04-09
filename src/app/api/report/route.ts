import { NextResponse } from "next/server";

import { buildMonthlyReportApiDocumentHtml } from "@/lib/report/monthly-report-html-string";
import { loadMonthlyReportViewProps } from "@/lib/report/load-monthly-report";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
