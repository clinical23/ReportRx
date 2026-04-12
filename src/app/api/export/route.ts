import { NextResponse } from "next/server";

import { activityClinicianKeys } from "@/lib/supabase/clinician-scope";
import {
  resolveReportingPracticeScope,
  type ReportingPracticeOption,
} from "@/lib/supabase/reporting";
import { createClient } from "@/lib/supabase/server";

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const today = new Date();
  const defaultStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const defaultEnd = today.toISOString().slice(0, 10);
  const startDate = searchParams.get("start") || defaultStart;
  const endDate = searchParams.get("end") || defaultEnd;
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
    const headers = [
      "Date",
      "Clinician",
      "Practice",
      "PCN",
      "Category",
      "Appointments",
      "Hours",
    ];
    const csv = [headers.map(csvCell).join(",")].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="reportrx-export-${startDate}-to-${endDate}.csv"`,
      },
    });
  }

  let query = supabase
    .from("activity_report")
    .select("*")
    .gte("log_date", startDate)
    .lte("log_date", endDate)
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
      const headers = [
        "Date",
        "Clinician",
        "Practice",
        "PCN",
        "Category",
        "Appointments",
        "Hours",
      ];
      const csv = [headers.map(csvCell).join(",")].join("\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="reportrx-export-${startDate}-to-${endDate}.csv"`,
        },
      });
    }
    query = query.in("clinician_id", keys);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const headers = [
    "Date",
    "Clinician",
    "Practice",
    "PCN",
    "Category",
    "Appointments",
    "Hours",
  ];
  const rows = (data ?? []).map((row) => [
    row.log_date,
    row.clinician_name,
    row.practice_name,
    row.pcn_name ?? "",
    row.category_name,
    row.appointment_count,
    row.hours_worked ?? "",
  ]);

  const csv = [
    headers.map(csvCell).join(","),
    ...rows.map((row) => row.map(csvCell).join(",")),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reportrx-export-${startDate}-to-${endDate}.csv"`,
    },
  });
}
