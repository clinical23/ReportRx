import { NextResponse } from "next/server";

import { getProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  await getProfile();
  const supabase = await createClient();

  const { searchParams } = new URL(request.url);
  const today = new Date();
  const defaultStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const defaultEnd = today.toISOString().slice(0, 10);
  const startDate = searchParams.get("start") || defaultStart;
  const endDate = searchParams.get("end") || defaultEnd;

  const { data, error } = await supabase
    .from("activity_report")
    .select("*")
    .gte("log_date", startDate)
    .lte("log_date", endDate)
    .order("log_date", { ascending: false });

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
