import { NextResponse } from "next/server";

import {
  formatDateUK,
  londonMonthRangeISO,
  todayISOInLondon,
  UK_TIMEZONE,
} from "@/lib/datetime";
import { activityClinicianKeys } from "@/lib/supabase/clinician-scope";
import {
  resolveReportingPracticeScope,
  type ReportingPracticeOption,
} from "@/lib/supabase/reporting";
import { createClient } from "@/lib/supabase/server";

const UTF8_BOM = "\uFEFF";

const CSV_HEADERS = [
  "Date",
  "Clinician",
  "Practice",
  "PCN",
  "Category",
  "Appointments",
  "Hours",
  "Submitted",
] as const;

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

/** DD/MM/YYYY for activity log date (ISO YYYY-MM-DD). */
function csvUkDate(isoYmd: string | null | undefined): string {
  if (!isoYmd || String(isoYmd).trim() === "") return "";
  const formatted = formatDateUK(String(isoYmd).slice(0, 10));
  return formatted === "—" ? "" : formatted;
}

/** DD/MM/YYYY HH:MM (24h, Europe/London) for timestamps. */
function csvUkDateTime(iso: string | null | undefined): string {
  if (!iso || String(iso).trim() === "") return "";
  const d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return "";
  const dateStr = d.toLocaleDateString("en-GB", {
    timeZone: UK_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeStr = d.toLocaleTimeString("en-GB", {
    timeZone: UK_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${dateStr} ${timeStr}`;
}

function formatCsvHours(value: unknown): string {
  if (value == null || value === "") return "";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return n.toLocaleString("en-GB", {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(n) ? 0 : 1,
  });
}

function formatCsvCount(value: unknown): string {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return "0";
  return n.toLocaleString("en-GB", { maximumFractionDigits: 0 });
}

function csvAttachmentFilename(): string {
  const day = new Date().toISOString().split("T")[0];
  return `reportrx-export-${day}.csv`;
}

function csvResponse(csvBody: string): Response {
  const csvContent = UTF8_BOM + csvBody;
  return new Response(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvAttachmentFilename()}"`,
    },
  });
}

function emptyCsv(): Response {
  const line = [...CSV_HEADERS].map((h) => csvCell(h)).join(",");
  return csvResponse(line);
}

type ReportRow = Record<string, unknown>;

function rowToCsvValues(row: ReportRow): string[] {
  const submittedRaw =
    (row.submitted_at as string | undefined) ??
    (row.created_at as string | undefined);

  return [
    csvUkDate(row.log_date as string | undefined),
    String(row.clinician_name ?? ""),
    String(row.practice_name ?? ""),
    String(row.pcn_name ?? ""),
    String(row.category_name ?? ""),
    formatCsvCount(row.appointment_count),
    formatCsvHours(row.hours_worked),
    csvUkDateTime(submittedRaw),
  ];
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const month = londonMonthRangeISO();
  const defaultStart = month.from;
  const defaultEnd = todayISOInLondon();
  const isoRe = /^\d{4}-\d{2}-\d{2}$/;
  const rawStart = searchParams.get("start")?.slice(0, 10) || defaultStart;
  const rawEnd = searchParams.get("end")?.slice(0, 10) || defaultEnd;
  const startDate = isoRe.test(rawStart) ? rawStart : defaultStart;
  const endDate = isoRe.test(rawEnd) ? rawEnd : defaultEnd;
  const startDateSafe = startDate <= endDate ? startDate : endDate;
  const endDateSafe = startDate <= endDate ? endDate : startDate;
  const pcnParam = searchParams.get("pcn");
  const practiceParam = searchParams.get("practice");

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("organisation_id, role, clinician_id")
    .eq("id", user.id)
    .maybeSingle();

  const orgId = profileRow?.organisation_id as string | undefined;
  if (!orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: practiceRows } = await supabase
    .from("practices")
    .select("id, name, pcn_id")
    .eq("organisation_id", orgId);

  const practices = (practiceRows ?? []) as ReportingPracticeOption[];
  const practiceScope = resolveReportingPracticeScope(
    practices,
    pcnParam,
    practiceParam,
  );

  if (practiceScope !== null && practiceScope.length === 0) {
    return emptyCsv();
  }

  let query = supabase
    .from("activity_report")
    .select("*")
    .gte("log_date", startDateSafe)
    .lte("log_date", endDateSafe)
    .order("log_date", { ascending: false });

  if (practiceScope != null && practiceScope.length > 0) {
    query = query.in("practice_id", practiceScope);
  }

  if (profileRow?.role === "clinician") {
    const keys = activityClinicianKeys({
      id: user.id,
      clinician_id: (profileRow.clinician_id as string | null) ?? null,
    });
    if (keys.length === 0) {
      return emptyCsv();
    }
    query = query.in("clinician_id", keys);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const headerLine = [...CSV_HEADERS].map((h) => csvCell(h)).join(",");
  const bodyLines = (data ?? []).map((row) =>
    rowToCsvValues(row as ReportRow).map(csvCell).join(","),
  );
  const csvBody = [headerLine, ...bodyLines].join("\n");

  return csvResponse(csvBody);
}
