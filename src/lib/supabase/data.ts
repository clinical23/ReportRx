import { londonMonthRangeISO } from "@/lib/datetime";

import type { Clinician } from "./database.types";
import { createClient } from "./server";

/** Activity log and other call sites — minimal fields only */
export type ClinicianListItem = {
  id: string;
  name: string;
  role: string;
};

export async function listClinicians(): Promise<ClinicianListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clinicians")
    .select("id, name, role")
    .order("name", { ascending: true });

  if (error) {
    console.error("[listClinicians]", error.message);
    return [];
  }

  return (data ?? []) as ClinicianListItem[];
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

export async function deletePcn(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.from("pcns").delete().eq("id", id);
  if (error) {
    console.error("[deletePcn]", error.message);
    return { error: error.message };
  }
  return { error: null };
}

export type ClinicianDirectoryRow = {
  id: string;
  name: string;
  role: string;
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
    .select("id, name, role, created_at")
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
  practice_ids: string[];
  pcn_ids: string[];
}): Promise<{ clinician: Clinician | null; error: string | null }> {
  const name = input.name.trim();
  if (!name) {
    return { clinician: null, error: "Name is required" };
  }

  const role = (input.role ?? "Clinician").trim() || "Clinician";

  const supabase = await createClient();
  const { data: clinician, error } = await supabase
    .from("clinicians")
    .insert({ name, role })
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
  practice_ids: string[];
  pcn_ids: string[];
}): Promise<{ error: string | null }> {
  const name = input.name.trim();
  if (!name) {
    return { error: "Name is required" };
  }

  const role = input.role.trim() || "Clinician";

  const supabase = await createClient();

  const { data: updated, error: upError } = await supabase
    .from("clinicians")
    .update({ name, role })
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
