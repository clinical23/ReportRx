"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Shield } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTimeUK } from "@/lib/datetime";
import { createClient } from "@/lib/supabase/client";
import type { AuditAction, AuditResourceType } from "@/lib/audit";

const LIMIT = 100;

const ACTION_FILTER_OPTIONS: Array<{ value: AuditAction | ""; label: string }> = [
  { value: "", label: "All" },
  { value: "view", label: "View" },
  { value: "create", label: "Create" },
  { value: "edit", label: "Edit" },
  { value: "delete", label: "Delete" },
  { value: "export", label: "Export" },
  { value: "login", label: "Login" },
  { value: "logout", label: "Logout" },
  { value: "invite", label: "Invite" },
  { value: "deactivate", label: "Deactivate" },
];

const RESOURCE_FILTER_OPTIONS: Array<{ value: AuditResourceType | ""; label: string }> = [
  { value: "", label: "All" },
  { value: "dashboard", label: "Dashboard" },
  { value: "reporting", label: "Reporting" },
  { value: "activity_log", label: "Activity log" },
  { value: "clinician", label: "Clinician" },
  { value: "settings", label: "Settings" },
  { value: "admin", label: "Admin" },
  { value: "auth", label: "Auth" },
  { value: "practice_assignment", label: "Practice assignment" },
  { value: "bulk_invite", label: "Bulk invite" },
  { value: "dsar", label: "DSAR" },
  { value: "additional_working_day", label: "Additional working day" },
];

type AuditRow = {
  id: string;
  organisation_id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type ProfileMini = { id: string; full_name: string | null; email: string | null };

function actionBadgeClass(action: string): string {
  switch (action) {
    case "view":
    case "logout":
      return "bg-slate-100 text-slate-800 ring-slate-200";
    case "create":
    case "login":
      return "bg-emerald-50 text-emerald-800 ring-emerald-200";
    case "edit":
      return "bg-blue-50 text-blue-800 ring-blue-200";
    case "delete":
      return "bg-red-50 text-red-800 ring-red-200";
    case "export":
      return "bg-teal-50 text-teal-800 ring-teal-200";
    case "invite":
      return "bg-purple-50 text-purple-800 ring-purple-200";
    case "deactivate":
      return "bg-orange-50 text-orange-900 ring-orange-200";
    default:
      return "bg-gray-100 text-gray-800 ring-gray-200";
  }
}

function sentenceCaseResourceType(rt: string): string {
  const found = RESOURCE_FILTER_OPTIONS.find((o) => o.value === rt);
  if (found) return found.label;
  return rt.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDetails(row: AuditRow): string {
  if (row.resource_id?.trim()) return row.resource_id.trim();
  const meta = row.metadata;
  if (!meta || Object.keys(meta).length === 0) return "—";
  const parts: string[] = [];
  if (meta.format != null) {
    const from = meta.date_from ?? meta.dateRange;
    const to = meta.date_to;
    if (from && to) parts.push(`${String(meta.format)} · ${String(from)} → ${String(to)}`);
    else parts.push(String(meta.format));
  }
  if (meta.email != null) parts.push(`email: ${String(meta.email)}`);
  if (meta.role != null) parts.push(`role: ${String(meta.role)}`);
  if (meta.field != null) parts.push(`field: ${String(meta.field)}`);
  if (meta.action != null && meta.format == null) parts.push(`op: ${String(meta.action)}`);
  if (meta.count != null) parts.push(`count: ${String(meta.count)}`);
  if (meta.date != null) parts.push(`date: ${String(meta.date)}`);
  if (meta.practice_id != null) parts.push(`practice: ${String(meta.practice_id).slice(0, 8)}…`);
  if (meta.practice_ids != null) parts.push(`practices: ${JSON.stringify(meta.practice_ids)}`);
  if (meta.requested_by != null) parts.push(`by: ${String(meta.requested_by).slice(0, 8)}…`);
  if (meta.old_role != null && meta.new_role != null) {
    parts.push(`role: ${String(meta.old_role)} → ${String(meta.new_role)}`);
  }
  if (meta.is_active != null) parts.push(`active: ${String(meta.is_active)}`);
  if (parts.length > 0) return parts.join(" · ");
  try {
    const s = JSON.stringify(meta);
    return s.length > 140 ? `${s.slice(0, 137)}…` : s;
  } catch {
    return "—";
  }
}

type Props = {
  organisationId: string;
};

export function AuditLogViewer({ organisationId }: Props) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [profiles, setProfiles] = useState<Map<string, ProfileMini>>(new Map());
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<AuditAction | "">("");
  const [resourceFilter, setResourceFilter] = useState<AuditResourceType | "">("");

  const load = useCallback(async () => {
    const supabase = createClient();
    let q = supabase
      .from("audit_logs")
      .select(
        "id, organisation_id, user_id, action, resource_type, resource_id, metadata, created_at",
      )
      .eq("organisation_id", organisationId)
      .order("created_at", { ascending: false })
      .limit(LIMIT);

    if (actionFilter) q = q.eq("action", actionFilter);
    if (resourceFilter) q = q.eq("resource_type", resourceFilter);

    const { data, error } = await q;
    if (error) {
      console.error("[AuditLogViewer]", error.message);
      setRows([]);
      setProfiles(new Map());
      return;
    }

    const chunk = (data ?? []) as AuditRow[];
    setRows(chunk);

    const ids = [...new Set(chunk.map((r) => r.user_id))];
    if (ids.length === 0) {
      setProfiles(new Map());
      return;
    }
    const { data: profs, error: pErr } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", ids);
    if (pErr) {
      console.error("[AuditLogViewer] profiles", pErr.message);
      setProfiles(new Map());
      return;
    }
    const map = new Map<string, ProfileMini>();
    for (const p of (profs ?? []) as ProfileMini[]) {
      map.set(p.id, p);
    }
    setProfiles(map);
  }, [organisationId, actionFilter, resourceFilter]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void load()
      .catch((e) => console.error("[AuditLogViewer]", e))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const userLabel = useMemo(() => {
    return (id: string) => {
      const p = profiles.get(id);
      if (!p) return id.slice(0, 8) + "…";
      return p.full_name?.trim() || p.email || id.slice(0, 8) + "…";
    };
  }, [profiles]);

  const showEmpty = !loading && rows.length === 0;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
      <h2 className="mb-1 text-lg font-semibold text-gray-900">Audit log</h2>
      <p className="mb-4 text-sm text-gray-500">
        Recent security and activity events for your organisation (up to {LIMIT} entries, newest
        first).
      </p>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="grid min-w-[10rem] flex-1 gap-1">
          <label htmlFor="audit-filter-action" className="text-xs font-medium text-gray-600">
            Action
          </label>
          <select
            id="audit-filter-action"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as AuditAction | "")}
            className="rounded-lg border border-gray-200 px-2 py-2 text-sm"
          >
            {ACTION_FILTER_OPTIONS.map((o) => (
              <option key={o.label + (o.value || "all")} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid min-w-[12rem] flex-1 gap-1">
          <label htmlFor="audit-filter-resource" className="text-xs font-medium text-gray-600">
            Resource
          </label>
          <select
            id="audit-filter-resource"
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value as AuditResourceType | "")}
            className="rounded-lg border border-gray-200 px-2 py-2 text-sm"
          >
            {RESOURCE_FILTER_OPTIONS.map((o) => (
              <option key={o.label + (o.value || "all")} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : showEmpty ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-12 text-center">
          <Shield className="h-8 w-8 text-gray-400" aria-hidden />
          <p className="text-sm font-medium text-gray-700">No audit logs found</p>
          <p className="text-xs text-gray-500">Try changing the filters or check back after activity.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {rows.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <p className="text-xs text-gray-500">{formatDateTimeUK(r.created_at)}</p>
                <p className="mt-1 text-sm font-medium text-gray-900">{userLabel(r.user_id)}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${actionBadgeClass(r.action)}`}
                  >
                    {r.action}
                  </span>
                  <span className="text-sm text-gray-700">{sentenceCaseResourceType(r.resource_type)}</span>
                </div>
                <p className="mt-2 break-words text-xs text-gray-600">{formatDetails(r)}</p>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-gray-200 md:block">
            <table className="w-full min-w-[48rem] text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-600">
                  <th className="px-3 py-2.5 font-medium">Date/Time</th>
                  <th className="px-3 py-2.5 font-medium">User</th>
                  <th className="px-3 py-2.5 font-medium">Action</th>
                  <th className="px-3 py-2.5 font-medium">Resource</th>
                  <th className="px-3 py-2.5 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100">
                    <td className="whitespace-nowrap px-3 py-2.5 text-gray-800">
                      {formatDateTimeUK(r.created_at)}
                    </td>
                    <td className="max-w-[10rem] truncate px-3 py-2.5 text-gray-700" title={r.user_id}>
                      {userLabel(r.user_id)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${actionBadgeClass(r.action)}`}
                      >
                        {r.action}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-700">
                      {sentenceCaseResourceType(r.resource_type)}
                    </td>
                    <td className="max-w-md px-3 py-2.5 text-xs text-gray-600">
                      {formatDetails(r)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
