import { londonMonthRangeISO } from "@/lib/datetime";

import type { Clinician } from "./database.types";
import { listOrgClinicianPracticeAssignments } from "@/lib/supabase/clinician-practice-assignments";
import { getProfile } from "@/lib/supabase/auth";
import { createClient } from "./server";

/** Team members (profiles) for activity bulk entry — same org as current user */
export type ClinicianListItem = {
  id: string;
  name: string;
  role: string;
};

export async function listClinicians(): Promise<ClinicianListItem[]> {
  const { organisation_id: organisationId } = await getProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("organisation_id", organisationId)
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  if (error) {
    console.error("[listClinicians]", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.full_name?.trim() || "—",
    role: row.role,
  }));
}

/** Team directory row (profiles + last log + practices via clinician_practices). */
export type TeamMemberRow = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  last_activity_date: string | null;
  practices_label: string;
  /** Profile-based practice assignments (clinicians only). */
  clinician_assignment?: {
    restricted: boolean;
    names_csv: string;
  };
};

/**
 * All profiles in an organisation with last activity (max weekday log_date per profile / clinician_id)
 * and practice names from `clinician_practices` (junction; legacy name in product copy may say "assignments").
 */
export async function listOrganisationTeamMembers(
  organisationId: string,
): Promise<TeamMemberRow[]> {
  const supabase = await createClient();
  const { data: profiles, error: profErr } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, role, is_active, clinician_id, practice_id",
    )
    .eq("organisation_id", organisationId)
    .order("full_name", { ascending: true });

  if (profErr) {
    console.error("[listOrganisationTeamMembers] profiles", profErr.message);
    return [];
  }

  const rows = profiles ?? [];
  if (rows.length === 0) {
    return [];
  }

  const assignmentRows = await listOrgClinicianPracticeAssignments(organisationId);
  const assignmentPracticeIdsByProfileId = new Map<string, string[]>();
  for (const ar of assignmentRows) {
    const list = assignmentPracticeIdsByProfileId.get(ar.clinician_id) ?? [];
    list.push(ar.practice_id);
    assignmentPracticeIdsByProfileId.set(ar.clinician_id, list);
  }

  const clinicianIdsForLinks = [
    ...new Set(
      rows
        .map((r) => r.clinician_id as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  let links: { clinician_id: string; practice_id: string }[] = [];
  if (clinicianIdsForLinks.length > 0) {
    const { data: linkRows, error: linkErr } = await supabase
      .from("clinician_practices")
      .select("clinician_id, practice_id")
      .in("clinician_id", clinicianIdsForLinks);
    if (linkErr) {
      console.error(
        "[listOrganisationTeamMembers] clinician_practices",
        linkErr.message,
      );
    } else {
      links = (linkRows ?? []) as {
        clinician_id: string;
        practice_id: string;
      }[];
    }
  }

  const { data: practiceRows, error: prErr } = await supabase
    .from("practices")
    .select("id, name");
  if (prErr) {
    console.error("[listOrganisationTeamMembers] practices", prErr.message);
  }
  const practiceNameById = new Map<string, string>();
  for (const p of practiceRows ?? []) {
    const row = p as { id: string; name: string };
    practiceNameById.set(row.id, row.name?.trim() || "—");
  }

  const practiceIdsByClinicianId = new Map<string, string[]>();
  for (const link of links) {
    const list = practiceIdsByClinicianId.get(link.clinician_id) ?? [];
    list.push(link.practice_id);
    practiceIdsByClinicianId.set(link.clinician_id, list);
  }

  const logIdKeys = new Set<string>();
  for (const p of rows) {
    logIdKeys.add(String(p.id));
    if (p.clinician_id) {
      logIdKeys.add(String(p.clinician_id));
    }
  }
  const lastLogByClinicianKey = new Map<string, string>();
  const logKeyArr = [...logIdKeys];
  if (logKeyArr.length > 0) {
    const { data: logRows, error: logErr } = await supabase
      .from("activity_logs")
      .select("clinician_id, log_date")
      .in("clinician_id", logKeyArr);
    if (logErr) {
      console.error("[listOrganisationTeamMembers] activity_logs", logErr.message);
    } else {
      for (const row of logRows ?? []) {
        const cid = row.clinician_id == null ? "" : String(row.clinician_id);
        const d = String(row.log_date ?? "").slice(0, 10);
        if (!cid || !d) continue;
        const prev = lastLogByClinicianKey.get(cid);
        if (!prev || d > prev) {
          lastLogByClinicianKey.set(cid, d);
        }
      }
    }
  }

  const maxDate = (a: string | undefined, b: string | undefined): string | null => {
    if (!a && !b) return null;
    if (!a) return b ?? null;
    if (!b) return a;
    return a > b ? a : b;
  };

  return rows.map((p) => {
    const name = String(p.full_name ?? "").trim() || "—";
    const email = String(p.email ?? "").trim() || "—";
    const cid = p.clinician_id ? String(p.clinician_id) : null;
    const pidKey = String(p.id);

    const lastActivity = maxDate(
      lastLogByClinicianKey.get(pidKey),
      cid ? lastLogByClinicianKey.get(cid) : undefined,
    );

    const practiceNames = new Set<string>();
    if (cid) {
      const pids = practiceIdsByClinicianId.get(cid) ?? [];
      for (const prid of pids) {
        const nm = practiceNameById.get(prid);
        if (nm) practiceNames.add(nm);
      }
    }
    const homePracticeId = p.practice_id as string | null;
    if (homePracticeId) {
      const nm = practiceNameById.get(homePracticeId);
      if (nm) practiceNames.add(nm);
    }
    const practices_label = [...practiceNames].sort().join(", ") || "—";

    const rawActive = (p as { is_active?: boolean | null }).is_active;
    const is_active = rawActive !== false;

    const roleStr = String(p.role ?? "clinician");
    let clinician_assignment: TeamMemberRow["clinician_assignment"];
    if (roleStr === "clinician") {
      const assignedPids =
        assignmentPracticeIdsByProfileId.get(pidKey) ?? [];
      if (assignedPids.length === 0) {
        clinician_assignment = { restricted: false, names_csv: "" };
      } else {
        const names = assignedPids
          .map((prid) => practiceNameById.get(prid))
          .filter((n): n is string => Boolean(n))
          .sort();
        clinician_assignment = {
          restricted: true,
          names_csv: names.join(", ") || "—",
        };
      }
    }

    return {
      id: String(p.id),
      full_name: name,
      email,
      role: roleStr,
      is_active,
      last_activity_date: lastActivity,
      practices_label,
      clinician_assignment,
    };
  });
}

export type PcnListItem = {
  id: string;
  name: string;
  created_at: string;
};

export async function listPcns(): Promise<PcnListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pcns")
    .select("id, name, created_at")
    .order("name", { ascending: true });

  if (error) {
    console.error("[listPcns]", error.message);
    return [];
  }

  return (data ?? []) as PcnListItem[];
}

export async function createPcn(name: string): Promise<{ error: string | null }> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { error: "Name is required" };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("pcns").insert({ name: trimmed });
  if (error) {
    console.error("[createPcn]", error.message);
    return { error: error.message };
  }
  return { error: null };
}

export async function updatePcn(
  id: string,
  name: string,
): Promise<{ error: string | null }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Name is required" };
  const supabase = await createClient();

  // Also update practices.pcn_name for any practices pointing at the old name
  const { data: old } = await supabase
    .from("pcns")
    .select("name")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase
    .from("pcns")
    .update({ name: trimmed })
    .eq("id", id);
  if (error) {
    console.error("[updatePcn]", error.message);
    return { error: error.message };
  }
  if (old?.name && old.name !== trimmed) {
    await supabase
      .from("practices")
      .update({ pcn_name: trimmed })
      .eq("pcn_name", old.name);
  }
  return { error: null };
}

export async function deletePcn(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  // Clear pcn_name on practices that reference this PCN
  const { data: pcn } = await supabase
    .from("pcns")
    .select("name")
    .eq("id", id)
    .maybeSingle();
  if (pcn?.name) {
    await supabase
      .from("practices")
      .update({ pcn_name: null })
      .eq("pcn_name", pcn.name);
  }
  const { error } = await supabase.from("pcns").delete().eq("id", id);
  if (error) {
    console.error("[deletePcn]", error.message);
    return { error: error.message };
  }
  return { error: null };
}

export async function updatePracticeName(
  id: string,
  name: string,
): Promise<{ error: string | null }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Name is required" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("practices")
    .update({ name: trimmed })
    .eq("id", id);
  if (error) {
    console.error("[updatePracticeName]", error.message);
    return { error: error.message };
  }
  return { error: null };
}

export async function assignPracticeToPcn(
  practiceId: string,
  pcnName: string | null,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("practices")
    .update({ pcn_name: pcnName })
    .eq("id", practiceId);
  if (error) {
    console.error("[assignPracticeToPcn]", error.message);
    return { error: error.message };
  }
  return { error: null };
}

export type PracticeWithPcn = {
  id: string;
  name: string;
  pcn_name: string | null;
};

export async function listPracticesWithPcn(): Promise<PracticeWithPcn[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("practices")
    .select("id, name, pcn_name")
    .order("name");
  if (error) {
    console.error("[listPracticesWithPcn]", error.message);
    return [];
  }
  return (data ?? []) as PracticeWithPcn[];
}

export type ClinicianDirectoryRow = {
  id: string;
  name: string;
  role: string;
  clinician_type_id: string | null;
  created_at: string;
  pcn_names: string[];
  pcn_ids: string[];
  practice_names: string[];
  practice_ids: string[];
  hours_this_month: number;
};

async function getClinicianHoursThisMonthMap(): Promise<Map<string, number>> {
  const { from, to } = londonMonthRangeISO();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_logs")
    .select("clinician_id, hours_worked")
    .gte("log_date", from)
    .lte("log_date", to);

  if (error) {
    console.error("[getClinicianHoursThisMonthMap]", error.message);
    return new Map();
  }

  const sums = new Map<string, number>();
  for (const row of data ?? []) {
    const id = String((row as { clinician_id: string }).clinician_id);
    const h = (row as { hours_worked: number | null }).hours_worked;
    const add = h == null ? 0 : Number(h);
    sums.set(id, (sums.get(id) ?? 0) + add);
  }
  return sums;
}

type ClinicianRowDb = {
  id: string;
  name: string;
  role: string;
  clinician_type_id: string | null;
  created_at: string;
};

/**
 * Loads clinicians + practice and PCN links without nested PostgREST embeds (avoids
 * schema-cache / relationship errors). Merges junction rows in memory.
 */
export async function getClinicians(): Promise<ClinicianDirectoryRow[]> {
  const supabase = await createClient();

  const { data: clinicianRows, error: clinError } = await supabase
    .from("clinicians")
    .select("id, name, role, clinician_type_id, created_at")
    .order("name", { ascending: true });

  if (clinError || !clinicianRows) {
    console.error("[getClinicians] clinicians", clinError?.message);
    return [];
  }

  const rows = clinicianRows as ClinicianRowDb[];

  const [hoursMap, linksRes, practicesRes, pcnLinksRes, pcnsRes] =
    await Promise.all([
      getClinicianHoursThisMonthMap(),
      supabase.from("clinician_practices").select("clinician_id, practice_id"),
      supabase.from("practices").select("id, name"),
      supabase.from("clinician_pcns").select("clinician_id, pcn_id"),
      supabase.from("pcns").select("id, name"),
    ]);

  if (linksRes.error) {
    console.error(
      "[getClinicians] clinician_practices",
      linksRes.error.message,
    );
  }
  if (practicesRes.error) {
    console.error("[getClinicians] practices", practicesRes.error.message);
  }
  if (pcnLinksRes.error) {
    console.error("[getClinicians] clinician_pcns", pcnLinksRes.error.message);
  }
  if (pcnsRes.error) {
    console.error("[getClinicians] pcns", pcnsRes.error.message);
  }

  const nameByPracticeId = new Map<string, string>();
  for (const p of practicesRes.data ?? []) {
    const row = p as { id: string; name: string };
    nameByPracticeId.set(row.id, row.name);
  }

  const nameByPcnId = new Map<string, string>();
  for (const p of pcnsRes.data ?? []) {
    const row = p as { id: string; name: string };
    nameByPcnId.set(row.id, row.name);
  }

  const linksByClinician = new Map<
    string,
    { practice_ids: string[]; practice_names: string[] }
  >();

  if (!linksRes.error && linksRes.data) {
    for (const raw of linksRes.data as {
      clinician_id: string;
      practice_id: string;
    }[]) {
      const cid = raw.clinician_id;
      const pid = raw.practice_id;
      if (!linksByClinician.has(cid)) {
        linksByClinician.set(cid, { practice_ids: [], practice_names: [] });
      }
      const g = linksByClinician.get(cid)!;
      g.practice_ids.push(pid);
      const pn = nameByPracticeId.get(pid);
      if (pn) g.practice_names.push(pn);
    }
  }

  for (const g of linksByClinician.values()) {
    g.practice_names.sort((a, b) => a.localeCompare(b));
  }

  const pcnByClinician = new Map<string, { id: string; name: string }[]>();

  if (!pcnLinksRes.error && pcnLinksRes.data) {
    for (const raw of pcnLinksRes.data as {
      clinician_id: string;
      pcn_id: string;
    }[]) {
      const cid = raw.clinician_id;
      const pid = raw.pcn_id;
      const n = nameByPcnId.get(pid);
      if (!n) continue;
      if (!pcnByClinician.has(cid)) {
        pcnByClinician.set(cid, []);
      }
      pcnByClinician.get(cid)!.push({ id: pid, name: n });
    }
  }

  for (const pairs of pcnByClinician.values()) {
    pairs.sort((a, b) => a.name.localeCompare(b.name));
  }

  return rows.map((r) => {
    const links = linksByClinician.get(r.id) ?? {
      practice_ids: [],
      practice_names: [],
    };
    const pcnPairs = pcnByClinician.get(r.id) ?? [];
    const pcns = {
      pcn_ids: pcnPairs.map((p) => p.id),
      pcn_names: pcnPairs.map((p) => p.name),
    };
    const rawHours = hoursMap.get(r.id) ?? 0;
    return {
      id: r.id,
      name: r.name,
      role: r.role,
      clinician_type_id: r.clinician_type_id,
      created_at: r.created_at,
      pcn_ids: pcns.pcn_ids,
      pcn_names: pcns.pcn_names,
      practice_ids: links.practice_ids,
      practice_names: links.practice_names,
      hours_this_month: Math.round(rawHours * 10) / 10,
    };
  });
}

export async function createClinician(input: {
  name: string;
  role?: string;
  clinician_type_id?: string | null;
  practice_ids: string[];
  pcn_ids: string[];
}): Promise<{ clinician: Clinician | null; error: string | null }> {
  const name = input.name.trim();
  if (!name) {
    return { clinician: null, error: "Name is required" };
  }

  const role = (input.role ?? "Clinician").trim() || "Clinician";
  const clinician_type_id =
    input.clinician_type_id != null && input.clinician_type_id !== ""
      ? input.clinician_type_id
      : null;

  const supabase = await createClient();
  const { data: clinician, error } = await supabase
    .from("clinicians")
    .insert({ name, role, clinician_type_id })
    .select()
    .single();

  if (error || !clinician) {
    console.error("[createClinician]", error?.message);
    return { clinician: null, error: error?.message ?? "Insert failed" };
  }

  const practiceIds = [...new Set(input.practice_ids.filter(Boolean))];
  if (practiceIds.length > 0) {
    const { error: linkError } = await supabase.from("clinician_practices").insert(
      practiceIds.map((practice_id) => ({
        clinician_id: clinician.id,
        practice_id,
      })),
    );
    if (linkError) {
      console.error("[createClinician] practice links", linkError.message);
      return {
        clinician: null,
        error: linkError.message,
      };
    }
  }

  const pcnIds = [...new Set(input.pcn_ids.filter(Boolean))];
  if (pcnIds.length > 0) {
    const { error: pcnErr } = await supabase.from("clinician_pcns").insert(
      pcnIds.map((pcn_id) => ({
        clinician_id: clinician.id,
        pcn_id,
      })),
    );
    if (pcnErr) {
      console.error("[createClinician] pcn links", pcnErr.message);
      return {
        clinician: null,
        error: pcnErr.message,
      };
    }
  }

  return { clinician, error: null };
}

export async function updateClinician(input: {
  id: string;
  name: string;
  role: string;
  clinician_type_id: string | null;
  practice_ids: string[];
  pcn_ids: string[];
}): Promise<{ error: string | null }> {
  const name = input.name.trim();
  if (!name) {
    return { error: "Name is required" };
  }

  const role = input.role.trim() || "Clinician";
  const clinician_type_id =
    input.clinician_type_id && input.clinician_type_id !== ""
      ? input.clinician_type_id
      : null;

  const supabase = await createClient();

  const { data: updated, error: upError } = await supabase
    .from("clinicians")
    .update({ name, role, clinician_type_id })
    .eq("id", input.id)
    .select("id")
    .maybeSingle();

  if (upError) {
    console.error("[updateClinician]", upError.message);
    return { error: upError.message };
  }
  if (!updated) {
    console.error("[updateClinician] no row updated (check RLS policies)");
    return {
      error:
        "Could not update clinician. If this persists, ensure the database allows updates on clinicians (RLS).",
    };
  }

  const { error: delPracticeErr } = await supabase
    .from("clinician_practices")
    .delete()
    .eq("clinician_id", input.id);

  if (delPracticeErr) {
    console.error("[updateClinician] delete practice links", delPracticeErr.message);
    return { error: delPracticeErr.message };
  }

  const practiceIds = [...new Set(input.practice_ids.filter(Boolean))];
  if (practiceIds.length > 0) {
    const { error: insError } = await supabase.from("clinician_practices").insert(
      practiceIds.map((practice_id) => ({
        clinician_id: input.id,
        practice_id,
      })),
    );
    if (insError) {
      console.error("[updateClinician] insert practice links", insError.message);
      return { error: insError.message };
    }
  }

  const { error: delPcnErr } = await supabase
    .from("clinician_pcns")
    .delete()
    .eq("clinician_id", input.id);

  if (delPcnErr) {
    console.error("[updateClinician] delete pcn links", delPcnErr.message);
    return { error: delPcnErr.message };
  }

  const pcnIds = [...new Set(input.pcn_ids.filter(Boolean))];
  if (pcnIds.length > 0) {
    const { error: pcnInsErr } = await supabase.from("clinician_pcns").insert(
      pcnIds.map((pcn_id) => ({
        clinician_id: input.id,
        pcn_id,
      })),
    );
    if (pcnInsErr) {
      console.error("[updateClinician] insert pcn links", pcnInsErr.message);
      return { error: pcnInsErr.message };
    }
  }

  return { error: null };
}

export async function deleteClinician(
  id: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { error: delPractices } = await supabase
    .from("clinician_practices")
    .delete()
    .eq("clinician_id", id);
  if (delPractices) {
    console.error("[deleteClinician] clinician_practices", delPractices.message);
    return { error: delPractices.message };
  }

  const { error: delPcns } = await supabase
    .from("clinician_pcns")
    .delete()
    .eq("clinician_id", id);
  if (delPcns) {
    console.error("[deleteClinician] clinician_pcns", delPcns.message);
    return { error: delPcns.message };
  }

  const { error } = await supabase.from("clinicians").delete().eq("id", id);
  if (error) {
    console.error("[deleteClinician] clinicians", error.message);
    return { error: error.message };
  }
  return { error: null };
}
