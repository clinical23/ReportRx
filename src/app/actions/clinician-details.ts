"use server";

import { revalidatePath } from "next/cache";

import { logAuditWithServerSupabase } from "@/lib/audit";
import {
  DOCUMENT_TYPE_OPTIONS,
  type ClinicianDetailsRow,
} from "@/lib/clinician-compliance";
import { getProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export type ClinicianDetailsActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

async function requireOrgAdmin() {
  const profile = await getProfile();
  if (profile.role !== "admin" && profile.role !== "superadmin") {
    return { ok: false as const, error: "Unauthorised" };
  }
  return { ok: true as const, profile };
}

async function assertProfileClinicianInOrg(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organisationId: string,
  clinicianId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("clinician_id", clinicianId)
    .eq("organisation_id", organisationId)
    .maybeSingle();
  return Boolean(data);
}

export async function fetchClinicianAdminData(clinicianId: string): Promise<
  ClinicianDetailsActionResult<{
    details: ClinicianDetailsRow | null;
    documents: Array<{
      id: string;
      document_type: string;
      file_name: string;
      file_path: string;
      created_at: string;
      uploaded_by: string;
      uploader_name: string;
      downloadUrl: string | null;
    }>;
  }>
> {
  const gate = await requireOrgAdmin();
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }
  const { profile } = gate;

  if (!clinicianId?.trim()) {
    return { success: false, error: "Missing clinician." };
  }

  const supabase = await createClient();
  const ok = await assertProfileClinicianInOrg(
    supabase,
    profile.organisation_id,
    clinicianId,
  );
  if (!ok) {
    return { success: false, error: "Clinician not found in your organisation." };
  }

  const { data: details, error: dErr } = await supabase
    .from("clinician_details")
    .select("*")
    .eq("clinician_id", clinicianId)
    .maybeSingle();

  if (dErr) {
    console.error("[fetchClinicianAdminData] details", dErr.message);
    return { success: false, error: dErr.message };
  }

  const { data: docs, error: docErr } = await supabase
    .from("clinician_documents")
    .select("id, document_type, file_name, file_path, created_at, uploaded_by")
    .eq("clinician_id", clinicianId)
    .order("created_at", { ascending: false });

  if (docErr) {
    console.error("[fetchClinicianAdminData] docs", docErr.message);
    return { success: false, error: docErr.message };
  }

  const uploaderIds = [...new Set((docs ?? []).map((d) => d.uploaded_by))];
  const namesById = new Map<string, string>();
  if (uploaderIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", uploaderIds);
    for (const p of profs ?? []) {
      namesById.set(p.id, p.full_name?.trim() || "—");
    }
  }

  const documents = [];
  for (const row of docs ?? []) {
    const { data: signed, error: sErr } = await supabase.storage
      .from("clinician-documents")
      .createSignedUrl(row.file_path, 3600);
    if (sErr) {
      console.warn("[fetchClinicianAdminData] signed url", sErr.message);
    }
    documents.push({
      id: row.id,
      document_type: row.document_type,
      file_name: row.file_name,
      file_path: row.file_path,
      created_at: row.created_at,
      uploaded_by: row.uploaded_by,
      uploader_name: namesById.get(row.uploaded_by) ?? "—",
      downloadUrl: signed?.signedUrl ?? null,
    });
  }

  return {
    success: true,
    data: { details: details ?? null, documents },
  };
}

export async function upsertClinicianDetailsAction(input: {
  clinicianId: string;
  clinical_role: string;
  gphc_number: string;
  dbs_number: string;
  dbs_expiry: string;
  indemnity_provider: string;
  indemnity_number: string;
  indemnity_expiry: string;
  smartcard_number: string;
  admin_notes: string;
}): Promise<ClinicianDetailsActionResult> {
  const gate = await requireOrgAdmin();
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }
  const { profile } = gate;

  const clinicianId = input.clinicianId?.trim();
  if (!clinicianId) {
    return { success: false, error: "Missing clinician." };
  }

  const supabase = await createClient();
  const ok = await assertProfileClinicianInOrg(
    supabase,
    profile.organisation_id,
    clinicianId,
  );
  if (!ok) {
    return { success: false, error: "Clinician not found in your organisation." };
  }

  const now = new Date().toISOString();
  const payload = {
    clinician_id: clinicianId,
    organisation_id: profile.organisation_id,
    clinical_role: input.clinical_role?.trim() || null,
    gphc_number: input.gphc_number?.trim() || null,
    dbs_number: input.dbs_number?.trim() || null,
    dbs_expiry: input.dbs_expiry?.trim() || null,
    indemnity_provider: input.indemnity_provider?.trim() || null,
    indemnity_number: input.indemnity_number?.trim() || null,
    indemnity_expiry: input.indemnity_expiry?.trim() || null,
    smartcard_number: input.smartcard_number?.trim() || null,
    admin_notes: input.admin_notes?.trim() || null,
    updated_at: now,
    updated_by: profile.id,
  };

  const { error } = await supabase.from("clinician_details").upsert(payload, {
    onConflict: "clinician_id",
  });

  if (error) {
    console.error("[upsertClinicianDetailsAction]", error.message);
    return { success: false, error: error.message || "Could not save details." };
  }

  logAuditWithServerSupabase(supabase, "edit", "clinician", clinicianId, {
    field: "clinician_details",
  });

  revalidatePath("/clinicians");
  return { success: true };
}

export async function uploadClinicianDocumentAction(
  formData: FormData,
): Promise<ClinicianDetailsActionResult> {
  const gate = await requireOrgAdmin();
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }
  const { profile } = gate;

  const clinicianId = String(formData.get("clinician_id") ?? "").trim();
  const documentType = String(formData.get("document_type") ?? "").trim();
  const notesRaw = String(formData.get("notes") ?? "").trim();
  const file = formData.get("file");

  if (!clinicianId) {
    return { success: false, error: "Missing clinician." };
  }
  if (!(DOCUMENT_TYPE_OPTIONS as readonly string[]).includes(documentType)) {
    return { success: false, error: "Invalid document type." };
  }
  if (!(file instanceof File) || file.size <= 0) {
    return { success: false, error: "Choose a file to upload." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { success: false, error: "File must be 10MB or smaller." };
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return {
      success: false,
      error: "Allowed types: PDF, JPEG, PNG, WebP, DOC, DOCX.",
    };
  }

  const supabase = await createClient();
  const ok = await assertProfileClinicianInOrg(
    supabase,
    profile.organisation_id,
    clinicianId,
  );
  if (!ok) {
    return { success: false, error: "Clinician not found in your organisation." };
  }

  const safeName = file.name.replace(/[^\w.\- ()]+/g, "_").slice(0, 180);
  const filePath = `${profile.organisation_id}/${clinicianId}/${Date.now()}-${safeName}`;

  const buf = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await supabase.storage
    .from("clinician-documents")
    .upload(filePath, buf, {
      contentType: file.type,
      upsert: false,
    });

  if (upErr) {
    console.error("[uploadClinicianDocumentAction] storage", upErr.message);
    return { success: false, error: upErr.message || "Upload failed." };
  }

  const { error: insErr } = await supabase.from("clinician_documents").insert({
    clinician_id: clinicianId,
    organisation_id: profile.organisation_id,
    document_type: documentType,
    file_name: file.name,
    file_path: filePath,
    file_size: file.size,
    mime_type: file.type,
    uploaded_by: profile.id,
    notes: notesRaw || null,
  });

  if (insErr) {
    console.error("[uploadClinicianDocumentAction] insert", insErr.message);
    await supabase.storage.from("clinician-documents").remove([filePath]);
    return { success: false, error: insErr.message || "Could not save document." };
  }

  logAuditWithServerSupabase(supabase, "create", "clinician", clinicianId, {
    field: "clinician_document",
    document_type: documentType,
    file_name: file.name,
  });

  revalidatePath("/clinicians");
  return { success: true };
}

export async function deleteClinicianDocumentAction(input: {
  documentId: string;
}): Promise<ClinicianDetailsActionResult> {
  const gate = await requireOrgAdmin();
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }
  const { profile } = gate;

  const documentId = input.documentId?.trim();
  if (!documentId) {
    return { success: false, error: "Missing document." };
  }

  const supabase = await createClient();
  const { data: doc, error: fErr } = await supabase
    .from("clinician_documents")
    .select("id, clinician_id, file_path, organisation_id")
    .eq("id", documentId)
    .maybeSingle();

  if (fErr || !doc) {
    return { success: false, error: "Document not found." };
  }
  if (doc.organisation_id !== profile.organisation_id) {
    return { success: false, error: "Document not found." };
  }

  const inOrg = await assertProfileClinicianInOrg(
    supabase,
    profile.organisation_id,
    doc.clinician_id,
  );
  if (!inOrg) {
    return { success: false, error: "Document not found." };
  }

  const { error: stErr } = await supabase.storage
    .from("clinician-documents")
    .remove([doc.file_path]);

  if (stErr) {
    console.error("[deleteClinicianDocumentAction] storage", stErr.message);
  }

  const { error: delErr } = await supabase
    .from("clinician_documents")
    .delete()
    .eq("id", documentId)
    .eq("organisation_id", profile.organisation_id);

  if (delErr) {
    console.error("[deleteClinicianDocumentAction] delete", delErr.message);
    return { success: false, error: delErr.message || "Could not delete document." };
  }

  logAuditWithServerSupabase(
    supabase,
    "delete",
    "clinician",
    doc.clinician_id,
    { field: "clinician_document", document_id: documentId },
  );

  revalidatePath("/clinicians");
  return { success: true };
}

export async function refreshClinicianDocumentUrlAction(input: {
  filePath: string;
}): Promise<ClinicianDetailsActionResult<{ url: string }>> {
  const gate = await requireOrgAdmin();
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }
  const { profile } = gate;

  const filePath = input.filePath?.trim();
  if (!filePath || !filePath.startsWith(`${profile.organisation_id}/`)) {
    return { success: false, error: "Invalid file." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("clinician-documents")
    .createSignedUrl(filePath, 3600);

  if (error || !data?.signedUrl) {
    return { success: false, error: error?.message || "Could not create link." };
  }

  return { success: true, data: { url: data.signedUrl } };
}
