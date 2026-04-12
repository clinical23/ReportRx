"use server";

import { revalidatePath } from "next/cache";

import { logAuditWithServerSupabase } from "@/lib/audit";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import {
  eachIsoDateInRangeInclusive,
  isoWeekdayFromYmd,
  normalizeWorkingDays,
} from "@/lib/working-pattern";

export async function updateClinicianWorkingDays(
  clinicianId: string,
  workingDays: number[],
): Promise<{ success: boolean; error?: string }> {
  const profile = await requireRole("superadmin", "admin");
  const supabase = await createClient();
  const trimmed = clinicianId?.trim();
  if (!trimmed) {
    return { success: false, error: "Clinician is required." };
  }

  const days = normalizeWorkingDays(workingDays);
  if (days.length === 0) {
    return { success: false, error: "Select at least one working day." };
  }

  const { data: target } = await supabase
    .from("profiles")
    .select("id, role, organisation_id, working_days")
    .eq("id", trimmed)
    .maybeSingle();

  if (
    !target ||
    target.organisation_id !== profile.organisation_id ||
    target.role !== "clinician"
  ) {
    return { success: false, error: "Invalid clinician for this organisation." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      working_days: days,
      updated_at: new Date().toISOString(),
    })
    .eq("id", trimmed)
    .eq("organisation_id", profile.organisation_id);

  if (error) {
    return { success: false, error: error.message };
  }

  logAuditWithServerSupabase(supabase, "edit", "clinician", trimmed, {
    field: "working_days",
    old: target.working_days,
    new: days,
  });

  revalidatePath("/admin");
  revalidatePath("/activity");
  revalidatePath("/reporting");
  return { success: true };
}

export async function approveAdditionalWorkingDay(input: {
  clinicianId: string;
  workDate: string;
  reason?: string | null;
}): Promise<{ success: boolean; error?: string; id?: string }> {
  const profile = await requireRole("superadmin", "admin");
  const supabase = await createClient();
  const orgId = profile.organisation_id;
  const cid = input.clinicianId?.trim();
  const wd = input.workDate?.trim().slice(0, 10);
  if (!cid || !wd || !/^\d{4}-\d{2}-\d{2}$/.test(wd)) {
    return { success: false, error: "Clinician and a valid date are required." };
  }

  const { data: target } = await supabase
    .from("profiles")
    .select("id, role, organisation_id")
    .eq("id", cid)
    .maybeSingle();

  if (
    !target ||
    target.organisation_id !== orgId ||
    target.role !== "clinician"
  ) {
    return { success: false, error: "Invalid clinician." };
  }

  const reason =
    input.reason?.trim() === "" || input.reason == null
      ? null
      : input.reason.trim();

  const { data: inserted, error } = await supabase
    .from("additional_working_days")
    .insert({
      clinician_id: cid,
      work_date: wd,
      reason,
      approved_by: profile.id,
      organisation_id: orgId,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        success: false,
        error: "That date is already approved for this clinician.",
      };
    }
    return { success: false, error: error.message };
  }

  logAuditWithServerSupabase(
    supabase,
    "create",
    "additional_working_day",
    inserted?.id,
    { clinician_id: cid, work_date: wd },
  );

  revalidatePath("/admin");
  revalidatePath("/activity");
  revalidatePath("/reporting");
  return { success: true, id: inserted?.id };
}

/** Approve many dates (e.g. every Saturday in a range). */
export async function approveAdditionalWorkingDaysBulk(input: {
  clinicianId: string;
  rangeStart: string;
  rangeEnd: string;
  /** ISO weekdays to include (1=Mon … 7=Sun). Empty = all days in range. */
  isoWeekdays: number[];
  reason?: string | null;
}): Promise<{ success: boolean; error?: string; count?: number }> {
  const profile = await requireRole("superadmin", "admin");
  const supabase = await createClient();
  const orgId = profile.organisation_id;
  const cid = input.clinicianId?.trim();
  const a = input.rangeStart?.slice(0, 10);
  const b = input.rangeEnd?.slice(0, 10);
  if (!cid || !a || !b || !/^\d{4}-\d{2}-\d{2}$/.test(a) || !/^\d{4}-\d{2}-\d{2}$/.test(b)) {
    return { success: false, error: "Clinician and valid date range are required." };
  }
  const start = a <= b ? a : b;
  const end = a <= b ? b : a;

  const { data: target } = await supabase
    .from("profiles")
    .select("id, role, organisation_id")
    .eq("id", cid)
    .maybeSingle();

  if (
    !target ||
    target.organisation_id !== orgId ||
    target.role !== "clinician"
  ) {
    return { success: false, error: "Invalid clinician." };
  }

  const weekdayFilter =
    input.isoWeekdays?.length > 0 ? new Set(input.isoWeekdays) : null;
  const dates = eachIsoDateInRangeInclusive(start, end).filter((d) => {
    if (!weekdayFilter) return true;
    return weekdayFilter.has(isoWeekdayFromYmd(d));
  });

  if (dates.length === 0) {
    return { success: false, error: "No dates matched your range and day filter." };
  }

  const reason =
    input.reason?.trim() === "" || input.reason == null
      ? null
      : input.reason.trim();

  const { data: existing } = await supabase
    .from("additional_working_days")
    .select("work_date")
    .eq("clinician_id", cid)
    .eq("organisation_id", orgId)
    .in("work_date", dates);

  const have = new Set(
    (existing ?? []).map((r) => String(r.work_date).slice(0, 10)),
  );
  const toInsert = dates.filter((d) => !have.has(d));
  if (toInsert.length === 0) {
    return {
      success: false,
      error: "All selected dates are already approved for this clinician.",
    };
  }

  const { error } = await supabase.from("additional_working_days").insert(
    toInsert.map((work_date) => ({
      clinician_id: cid,
      work_date,
      reason,
      approved_by: profile.id,
      organisation_id: orgId,
    })),
  );

  if (error) {
    return { success: false, error: error.message };
  }

  logAuditWithServerSupabase(supabase, "create", "additional_working_day", undefined, {
    clinician_id: cid,
    bulk_count: toInsert.length,
    range: `${start}→${end}`,
  });

  revalidatePath("/admin");
  revalidatePath("/activity");
  revalidatePath("/reporting");
  return { success: true, count: toInsert.length };
}

export async function revokeAdditionalWorkingDay(
  dayId: string,
): Promise<{ success: boolean; error?: string }> {
  const profile = await requireRole("superadmin", "admin");
  const supabase = await createClient();
  const id = dayId?.trim();
  if (!id) {
    return { success: false, error: "Record id is required." };
  }

  const { data: row } = await supabase
    .from("additional_working_days")
    .select("id, clinician_id, work_date, organisation_id")
    .eq("id", id)
    .maybeSingle();

  if (!row || row.organisation_id !== profile.organisation_id) {
    return { success: false, error: "Record not found." };
  }

  const { error } = await supabase.from("additional_working_days").delete().eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  logAuditWithServerSupabase(supabase, "delete", "additional_working_day", id, {
    clinician_id: row.clinician_id,
    work_date: row.work_date,
  });

  revalidatePath("/admin");
  revalidatePath("/activity");
  revalidatePath("/reporting");
  return { success: true };
}
