"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  deleteClinicianDocumentAction,
  fetchClinicianAdminData,
  refreshClinicianDocumentUrlAction,
  uploadClinicianDocumentAction,
  upsertClinicianDetailsAction,
} from "@/app/actions/clinician-details";
import {
  updateTeamMemberDetails,
  updateTeamMemberRoleClient,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast-provider";
import {
  CLINICAL_ROLE_OPTIONS,
  DOCUMENT_TYPE_OPTIONS,
  expiryBadgeTone,
  type ClinicianDetailsRow,
} from "@/lib/clinician-compliance";
import type { TeamMemberRow } from "@/lib/supabase/data";
import { cn } from "@/lib/utils";

export type TeamMemberEditTab = "basic" | "professional" | "documents";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: TeamMemberRow | null;
  initialTab: TeamMemberEditTab;
  viewerRole: string;
  viewerUserId: string;
};

const ROLE_OPTIONS_BASE = [
  { value: "clinician", label: "Clinician" },
  { value: "manager", label: "Manager" },
  { value: "practice_manager", label: "Practice manager" },
  { value: "pcn_manager", label: "PCN manager" },
  { value: "admin", label: "Admin" },
] as const;

function ExpiryHint({ dateStr }: { dateStr: string }) {
  const tone = expiryBadgeTone(dateStr);
  if (tone === "none") return null;
  return (
    <span
      className={cn(
        "ml-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        tone === "bad"
          ? "bg-red-50 text-red-800 ring-red-200"
          : "bg-amber-50 text-amber-900 ring-amber-200",
      )}
    >
      {tone === "bad" ? "Expired" : "≤30 days"}
    </span>
  );
}

export function TeamMemberEditDialog({
  open,
  onOpenChange,
  member,
  initialTab,
  viewerRole,
  viewerUserId,
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<TeamMemberEditTab>("basic");
  const [loadPending, setLoadPending] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");

  const [clinicalRole, setClinicalRole] = useState("");
  const [gphc, setGphc] = useState("");
  const [dbsNum, setDbsNum] = useState("");
  const [dbsExp, setDbsExp] = useState("");
  const [indProv, setIndProv] = useState("");
  const [indNum, setIndNum] = useState("");
  const [indExp, setIndExp] = useState("");
  const [smartcard, setSmartcard] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  type DocRow = {
    id: string;
    document_type: string;
    file_name: string;
    file_path: string;
    created_at: string;
    uploaded_by: string;
    uploader_name: string;
    downloadUrl: string | null;
  };

  const [docList, setDocList] = useState<DocRow[]>([]);
  const [docType, setDocType] = useState<string>(DOCUMENT_TYPE_OPTIONS[0]);
  const [docNotes, setDocNotes] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);

  const applyDetails = useCallback((d: ClinicianDetailsRow | null) => {
    setClinicalRole(d?.clinical_role ?? "");
    setGphc(d?.gphc_number ?? "");
    setDbsNum(d?.dbs_number ?? "");
    setDbsExp(d?.dbs_expiry?.slice(0, 10) ?? "");
    setIndProv(d?.indemnity_provider ?? "");
    setIndNum(d?.indemnity_number ?? "");
    setIndExp(d?.indemnity_expiry?.slice(0, 10) ?? "");
    setSmartcard(d?.smartcard_number ?? "");
    setAdminNotes(d?.admin_notes ?? "");
  }, []);

  const isSelf = member?.id === viewerUserId;
  const cannotEditTarget =
    !member ||
    isSelf ||
    (viewerRole === "admin" && member.role === "superadmin");

  const roleOptions =
    viewerRole === "superadmin"
      ? [...ROLE_OPTIONS_BASE, { value: "superadmin", label: "Superadmin" }]
      : ROLE_OPTIONS_BASE;

  const hasClinician = Boolean(member?.clinician_id);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  useEffect(() => {
    if (!open || !member) return;
    setFullName(member.full_name);
    setEmail(member.email);
    setRole(member.role);
  }, [open, member]);

  useEffect(() => {
    if (!open || !member?.clinician_id) {
      setDocList([]);
      applyDetails(null);
      return;
    }
    let cancelled = false;
    setLoadPending(true);
    void fetchClinicianAdminData(member.clinician_id).then((r) => {
      if (cancelled) return;
      setLoadPending(false);
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      if (!r.data) return;
      applyDetails(r.data.details);
      setDocList(r.data.documents as DocRow[]);
    });
    return () => {
      cancelled = true;
    };
  }, [open, member?.clinician_id, member?.id, applyDetails]); // eslint-disable-line react-hooks/exhaustive-deps -- toast

  const saveBasic = () => {
    if (!member || cannotEditTarget) return;
    startTransition(async () => {
      const d = await updateTeamMemberDetails({
        userId: member.id,
        fullName,
        email,
      });
      if (!d.success) {
        toast.error(d.error ?? "Could not save.");
        return;
      }
      if (role !== member.role) {
        const r = await updateTeamMemberRoleClient({
          userId: member.id,
          newRole: role,
        });
        if (!r.success) {
          toast.error(r.error ?? "Could not update role.");
          return;
        }
      }
      toast.success("Team member updated.");
      onOpenChange(false);
      router.refresh();
    });
  };

  const saveProfessional = () => {
    const cid = member?.clinician_id;
    if (!cid) return;
    startTransition(async () => {
      const r = await upsertClinicianDetailsAction({
        clinicianId: cid,
        clinical_role: clinicalRole,
        gphc_number: gphc,
        dbs_number: dbsNum,
        dbs_expiry: dbsExp,
        indemnity_provider: indProv,
        indemnity_number: indNum,
        indemnity_expiry: indExp,
        smartcard_number: smartcard,
        admin_notes: adminNotes,
      });
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      toast.success("Professional details saved.");
      router.refresh();
    });
  };

  const uploadDoc = () => {
    const cid = member?.clinician_id;
    if (!cid || !docFile) {
      toast.error("Choose a file to upload.");
      return;
    }
    const fd = new FormData();
    fd.set("clinician_id", cid);
    fd.set("document_type", docType);
    fd.set("notes", docNotes);
    fd.set("file", docFile);
    startTransition(async () => {
      const r = await uploadClinicianDocumentAction(fd);
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      toast.success("Document uploaded.");
      setDocFile(null);
      setDocNotes("");
      const reload = await fetchClinicianAdminData(cid);
      if (reload.success && reload.data) {
        setDocList(reload.data.documents as DocRow[]);
      }
      router.refresh();
    });
  };

  const removeDoc = (docId: string) => {
    startTransition(async () => {
      const r = await deleteClinicianDocumentAction({ documentId: docId });
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      toast.success("Document removed.");
      setDocList((prev) => prev.filter((d) => d.id !== docId));
      router.refresh();
    });
  };

  const openDownload = async (row: DocRow) => {
    let url = row.downloadUrl;
    if (!url) {
      const r = await refreshClinicianDocumentUrlAction({
        filePath: row.file_path,
      });
      if (!r.success || !r.data?.url) {
        toast.error(!r.success ? r.error : "Could not download.");
        return;
      }
      url = r.data.url;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (!member) return null;

  const tabBtn = (t: TeamMemberEditTab, label: string) => (
    <button
      type="button"
      key={t}
      onClick={() => setTab(t)}
      className={cn(
        "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
        tab === t
          ? "border-teal-600 text-teal-800"
          : "border-transparent text-gray-500 hover:text-gray-800",
      )}
    >
      {label}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,720px)] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit team member</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-1 border-b border-gray-200">
          {tabBtn("basic", "Basic info")}
          {tabBtn("professional", "Professional")}
          {tabBtn("documents", "Documents")}
        </div>

        {tab === "basic" ? (
          <div className="grid gap-3 pt-2">
            {cannotEditTarget ? (
              <p className="text-sm text-amber-800">
                You cannot edit this user&apos;s account details.
              </p>
            ) : null}
            <label className="grid gap-1 text-sm">
              <span className="text-gray-600">Full name</span>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={cannotEditTarget}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-gray-600">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={cannotEditTarget}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-gray-600">Role</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={cannotEditTarget}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {roleOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        {tab === "professional" ? (
          !hasClinician ? (
            <p className="py-6 text-sm text-gray-600">
              This user has no clinician profile linked. Professional and
              compliance fields apply to clinical team members only.
            </p>
          ) : loadPending ? (
            <p className="py-8 text-center text-sm text-gray-500">Loading…</p>
          ) : (
            <div className="grid gap-3 pt-2">
              <label className="grid gap-1 text-sm">
                <span className="text-gray-600">Clinical role</span>
                <select
                  value={clinicalRole}
                  onChange={(e) => setClinicalRole(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="">— Select —</option>
                  {CLINICAL_ROLE_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-gray-600">GPhC number</span>
                <input
                  value={gphc}
                  onChange={(e) => setGphc(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-gray-600">DBS check number</span>
                <input
                  value={dbsNum}
                  onChange={(e) => setDbsNum(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="inline-flex items-center text-gray-600">
                  DBS expiry
                  <ExpiryHint dateStr={dbsExp} />
                </span>
                <input
                  type="date"
                  value={dbsExp}
                  onChange={(e) => setDbsExp(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-gray-600">Indemnity provider</span>
                <input
                  value={indProv}
                  onChange={(e) => setIndProv(e.target.value)}
                  placeholder="e.g. Howden, Hiscox"
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-gray-600">Indemnity policy number</span>
                <input
                  value={indNum}
                  onChange={(e) => setIndNum(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="inline-flex items-center text-gray-600">
                  Indemnity expiry
                  <ExpiryHint dateStr={indExp} />
                </span>
                <input
                  type="date"
                  value={indExp}
                  onChange={(e) => setIndExp(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-gray-600">Smartcard number</span>
                <input
                  value={smartcard}
                  onChange={(e) => setSmartcard(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-gray-600">Admin notes</span>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </label>
            </div>
          )
        ) : null}

        {tab === "documents" ? (
          !hasClinician ? (
            <p className="py-6 text-sm text-gray-600">
              Document uploads require a linked clinician profile.
            </p>
          ) : loadPending ? (
            <p className="py-8 text-center text-sm text-gray-500">Loading…</p>
          ) : (
            <div className="space-y-4 pt-2">
              <div
                className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50/80 p-4"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) setDocFile(f);
                }}
              >
                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-gray-700">Upload file</span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,application/pdf,image/*"
                    onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
                    className="text-sm"
                  />
                  {docFile ? (
                    <span className="text-xs text-gray-600">{docFile.name}</span>
                  ) : (
                    <span className="text-xs text-gray-500">
                      Drag and drop here, or choose a file (max 10MB).
                    </span>
                  )}
                </label>
                <label className="mt-3 grid gap-1 text-sm">
                  <span className="text-gray-600">Document type</span>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    {DOCUMENT_TYPE_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mt-2 grid gap-1 text-sm">
                  <span className="text-gray-600">Notes (optional)</span>
                  <input
                    value={docNotes}
                    onChange={(e) => setDocNotes(e.target.value)}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </label>
                <Button
                  type="button"
                  className="mt-3 bg-teal-600 hover:bg-teal-700"
                  disabled={pending || !docFile}
                  onClick={uploadDoc}
                >
                  Upload
                </Button>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-900">
                  Uploaded documents
                </h3>
                <ul className="mt-2 divide-y divide-gray-100 rounded-lg border border-gray-200">
                  {docList.length === 0 ? (
                    <li className="px-3 py-6 text-center text-sm text-gray-500">
                      No documents yet.
                    </li>
                  ) : (
                    docList.map((d) => (
                      <li
                        key={d.id}
                        className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {d.file_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {d.document_type} · {d.uploader_name} ·{" "}
                            {new Date(d.created_at).toLocaleString("en-GB")}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void openDownload(d)}
                          >
                            Download
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-red-700"
                            disabled={pending}
                            onClick={() => removeDoc(d.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          )
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {tab === "basic" && !cannotEditTarget ? (
            <Button
              type="button"
              className="bg-teal-600 hover:bg-teal-700"
              disabled={pending}
              onClick={saveBasic}
            >
              Save
            </Button>
          ) : null}
          {tab === "professional" && hasClinician ? (
            <Button
              type="button"
              className="bg-teal-600 hover:bg-teal-700"
              disabled={pending || loadPending}
              onClick={saveProfessional}
            >
              Save professional details
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
