import { NextResponse } from "next/server";

import { logAuditWithServerSupabase } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const HOURS_24_MS = 24 * 60 * 60 * 1000;

function filenameSafeName(name: string): string {
  const s = name.trim().replace(/\s+/g, "-").toLowerCase();
  const cleaned = s.replace(/[^a-z0-9-]+/gi, "").replace(/-+/g, "-");
  return cleaned.length > 0 ? cleaned : "user";
}

type ProfileRow = {
  id: string;
  full_name: string;
  email: string | null;
  role: string;
  is_active: boolean;
  organisation_id: string;
  clinician_id: string | null;
  updated_at: string | null;
};

export async function GET(request: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const targetUserIdRaw = searchParams.get("userId")?.trim() || null;
  const subjectId = targetUserIdRaw || user.id;

  const admin = createAdminClient();

  const { data: callerProfile, error: callerErr } = await admin
    .from("profiles")
    .select("id, role, organisation_id")
    .eq("id", user.id)
    .maybeSingle();

  if (callerErr || !callerProfile) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (subjectId !== user.id) {
    if (callerProfile.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { data: subjectProfile, error: subjectErr } = await admin
    .from("profiles")
    .select(
      "id, full_name, email, role, is_active, organisation_id, clinician_id, updated_at",
    )
    .eq("id", subjectId)
    .maybeSingle();

  if (subjectErr || !subjectProfile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const profile = subjectProfile as ProfileRow;

  if (subjectId === user.id) {
    const since = new Date(Date.now() - HOURS_24_MS).toISOString();
    const { data: recent } = await admin
      .from("audit_logs")
      .select("id")
      .eq("user_id", user.id)
      .eq("action", "export")
      .eq("resource_type", "dsar")
      .is("resource_id", null)
      .gte("created_at", since)
      .limit(1)
      .maybeSingle();

    if (recent) {
      return NextResponse.json(
        {
          error:
            "You can only request a data export once per 24 hours.",
        },
        { status: 429 },
      );
    }
  }

  const { data: authUser } = await admin.auth.admin.getUserById(subjectId);
  const email =
    authUser?.user?.email ?? profile.email ?? "";
  const accountCreatedAt =
    authUser?.user?.created_at ?? null;

  const { data: orgRow } = await admin
    .from("organisations")
    .select("name, slug")
    .eq("id", profile.organisation_id)
    .maybeSingle();

  const { data: assignmentRows } = await admin
    .from("clinician_practice_assignments")
    .select("assigned_at, practice_id")
    .eq("clinician_id", subjectId)
    .order("assigned_at", { ascending: true });

  const practiceIds = [
    ...new Set((assignmentRows ?? []).map((r) => String(r.practice_id))),
  ];

  const practiceMeta = new Map<
    string,
    { name: string; pcn: string | null }
  >();

  if (practiceIds.length > 0) {
    const { data: practices } = await admin
      .from("practices")
      .select("id, name, pcn_id")
      .in("id", practiceIds);

    const pcnIds = [
      ...new Set(
        (practices ?? [])
          .map((p) => p.pcn_id as string | null)
          .filter(Boolean) as string[],
      ),
    ];

    const pcnNameById = new Map<string, string>();
    if (pcnIds.length > 0) {
      const { data: pcns } = await admin
        .from("pcns")
        .select("id, name")
        .in("id", pcnIds);
      for (const p of pcns ?? []) {
        pcnNameById.set(String(p.id), String(p.name));
      }
    }

    for (const p of practices ?? []) {
      const pid = String(p.id);
      const pcnId = p.pcn_id as string | null;
      practiceMeta.set(pid, {
        name: String(p.name ?? ""),
        pcn: pcnId ? (pcnNameById.get(pcnId) ?? null) : null,
      });
    }
  }

  const practice_assignments = (assignmentRows ?? []).map((row) => {
    const meta = practiceMeta.get(String(row.practice_id));
    return {
      practice: meta?.name ?? "—",
      pcn: meta?.pcn ?? null,
      assigned_at: row.assigned_at as string,
    };
  });

  const clinicianKeys = [profile.id];
  if (profile.clinician_id) {
    clinicianKeys.push(profile.clinician_id);
  }
  const uniqueClinicianKeys = [...new Set(clinicianKeys)];

  const { data: logRows } = await admin
    .from("activity_logs")
    .select("id, practice_id, log_date, hours_worked, created_at")
    .in("clinician_id", uniqueClinicianKeys)
    .order("log_date", { ascending: false });

  const logs = logRows ?? [];
  const logIds = logs.map((l) => String(l.id));

  const entriesByLog = new Map<
    string,
    Array<{ category_id: string; count: number }>
  >();
  const categoryNameById = new Map<string, string>();

  if (logIds.length > 0) {
    const { data: entries } = await admin
      .from("activity_log_entries")
      .select("log_id, category_id, count")
      .in("log_id", logIds);

    const catIds = new Set<string>();
    for (const e of entries ?? []) {
      const lid = String(e.log_id);
      const list = entriesByLog.get(lid) ?? [];
      list.push({
        category_id: String(e.category_id),
        count: Number(e.count ?? 0),
      });
      entriesByLog.set(lid, list);
      catIds.add(String(e.category_id));
    }

    if (catIds.size > 0) {
      const { data: cats } = await admin
        .from("activity_categories")
        .select("id, name")
        .in("id", [...catIds]);
      for (const c of cats ?? []) {
        categoryNameById.set(String(c.id), String(c.name ?? ""));
      }
    }
  }

  const logPracticeIds = [...new Set(logs.map((l) => String(l.practice_id)))];
  const logPracticeNames = new Map<string, string>();
  if (logPracticeIds.length > 0) {
    const { data: prs } = await admin
      .from("practices")
      .select("id, name")
      .in("id", logPracticeIds);
    for (const p of prs ?? []) {
      logPracticeNames.set(String(p.id), String(p.name ?? ""));
    }
  }

  const activity_logs = logs.map((row) => {
    const lid = String(row.id);
    const entries = entriesByLog.get(lid) ?? [];
    const categories: Record<string, number> = {};
    for (const e of entries) {
      const label =
        categoryNameById.get(e.category_id) ?? e.category_id;
      categories[label] = (categories[label] ?? 0) + e.count;
    }
    const created = row.created_at as string;
    return {
      date: String(row.log_date).slice(0, 10),
      practice: logPracticeNames.get(String(row.practice_id)) ?? "—",
      hours:
        row.hours_worked == null ? null : Number(row.hours_worked),
      categories,
      created_at: created,
      updated_at: created,
    };
  });

  const { data: editsByMe } = await admin
    .from("activity_log_edits")
    .select(
      "activity_log_id, field_name, old_value, new_value, reason, edited_at",
    )
    .eq("edited_by", subjectId)
    .order("edited_at", { ascending: false });

  const edits_by_me = (editsByMe ?? []).map((r) => ({
    log_id: String(r.activity_log_id),
    field_changed: String(r.field_name),
    old_value: r.old_value,
    new_value: r.new_value,
    reason: r.reason,
    created_at: r.edited_at as string,
  }));

  const { data: myLogIdRows } = await admin
    .from("activity_logs")
    .select("id")
    .in("clinician_id", uniqueClinicianKeys);

  const myLogIds = (myLogIdRows ?? []).map((r) => String(r.id));

  let edits_to_my_logs: Array<{
    log_id: string;
    edited_by: string;
    field_changed: string;
    old_value: string | null;
    new_value: string | null;
    reason: string | null;
    created_at: string;
  }> = [];

  if (myLogIds.length > 0) {
    const { data: editsToLogsRaw } = await admin
      .from("activity_log_edits")
      .select(
        "activity_log_id, edited_by, field_name, old_value, new_value, reason, edited_at",
      )
      .in("activity_log_id", myLogIds)
      .order("edited_at", { ascending: false });

    const editsToLogs = (editsToLogsRaw ?? []).filter(
      (r) => r.edited_by == null || String(r.edited_by) !== subjectId,
    );

    const editorIds = [
      ...new Set(
        editsToLogs
          .map((r) => r.edited_by as string | null)
          .filter(Boolean) as string[],
      ),
    ];

    const editorNameById = new Map<string, string>();
    if (editorIds.length > 0) {
      const { data: editors } = await admin
        .from("profiles")
        .select("id, full_name, email")
        .in("id", editorIds);
      for (const e of editors ?? []) {
        const label =
          (e.full_name as string | null)?.trim() ||
          (e.email as string | null)?.trim() ||
          String(e.id).slice(0, 8);
        editorNameById.set(String(e.id), label);
      }
    }

    edits_to_my_logs = editsToLogs.map((r) => ({
      log_id: String(r.activity_log_id),
      edited_by: r.edited_by
        ? (editorNameById.get(String(r.edited_by)) ?? String(r.edited_by).slice(0, 8))
        : "Unknown",
      field_changed: String(r.field_name),
      old_value: r.old_value,
      new_value: r.new_value,
      reason: r.reason,
      created_at: r.edited_at as string,
    }));
  }

  const { data: auditRows } = await admin
    .from("audit_logs")
    .select("action, resource_type, created_at")
    .eq("user_id", subjectId)
    .order("created_at", { ascending: false })
    .limit(5000);

  const audit_trail = (auditRows ?? []).map((r) => ({
    action: String(r.action),
    resource_type: String(r.resource_type),
    created_at: r.created_at as string,
  }));

  const exportData = {
    exported_at: new Date().toISOString(),
    subject: {
      name: profile.full_name,
      email,
      role: profile.role,
      is_active: profile.is_active,
      created_at: accountCreatedAt,
    },
    organisation: {
      name: orgRow?.name ?? "—",
      slug: orgRow?.slug ?? null,
    },
    practice_assignments,
    activity_logs,
    edits_by_me,
    edits_to_my_logs,
    audit_trail,
  };

  logAuditWithServerSupabase(supabase, "export", "dsar", undefined, {
    requested_by: user.id,
    ...(subjectId !== user.id ? { subject_user_id: subjectId } : {}),
  });

  const fname = `reportrx-data-export-${filenameSafeName(profile.full_name)}-${new Date().toISOString().split("T")[0]}.json`;

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fname}"`,
    },
  });
}
