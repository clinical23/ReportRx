"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { formatDateTimeUK } from "@/lib/datetime";
import { createClient } from "@/lib/supabase/client";
import type { AuditAction } from "@/lib/audit";

const PAGE_SIZE = 100;

const ACTION_OPTIONS: Array<AuditAction | ""> = [
  "",
  "view",
  "create",
  "edit",
  "delete",
  "export",
  "login",
  "logout",
  "invite",
  "deactivate",
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
      return "bg-slate-100 text-slate-800 ring-slate-200";
    case "create":
      return "bg-emerald-50 text-emerald-800 ring-emerald-200";
    case "edit":
      return "bg-blue-50 text-blue-800 ring-blue-200";
    case "export":
      return "bg-purple-50 text-purple-800 ring-purple-200";
    case "invite":
      return "bg-teal-50 text-teal-800 ring-teal-200";
    case "deactivate":
      return "bg-red-50 text-red-800 ring-red-200";
    case "delete":
      return "bg-orange-50 text-orange-900 ring-orange-200";
    case "login":
    case "logout":
      return "bg-amber-50 text-amber-900 ring-amber-200";
    default:
      return "bg-gray-100 text-gray-800 ring-gray-200";
  }
}

function summarizeMetadata(meta: Record<string, unknown> | null): string {
  if (!meta || Object.keys(meta).length === 0) return "—";
  const parts: string[] = [];
  if (meta.format && meta.dateRange) {
    parts.push(`${String(meta.format)} · ${JSON.stringify(meta.dateRange)}`);
  } else if (meta.dateRange) {
    parts.push(JSON.stringify(meta.dateRange));
  }
  if (meta.invitedEmail) parts.push(`invite: ${String(meta.invitedEmail)}`);
  if (meta.role) parts.push(`role: ${String(meta.role)}`);
  if (meta.count != null) parts.push(`count: ${String(meta.count)}`);
  if (meta.practiceId) parts.push(`practice: ${String(meta.practiceId).slice(0, 8)}…`);
  if (meta.fieldsChanged) parts.push(`fields: ${JSON.stringify(meta.fieldsChanged)}`);
  if (meta.practiceIds) parts.push(`practices: ${JSON.stringify(meta.practiceIds)}`);
  if (meta.reason) parts.push(`reason: ${String(meta.reason).slice(0, 40)}`);
  if (parts.length > 0) return parts.join(" · ");
  try {
    const s = JSON.stringify(meta);
    return s.length > 120 ? `${s.slice(0, 117)}…` : s;
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [userId, setUserId] = useState("");
  const [action, setAction] = useState<AuditAction | "">("");
  const [team, setTeam] = useState<ProfileMini[]>([]);
  const [queryFilters, setQueryFilters] = useState({
    dateFrom: "",
    dateTo: "",
    userId: "",
    action: "" as AuditAction | "",
  });

  const loadTeam = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("organisation_id", organisationId)
      .order("full_name", { ascending: true });
    setTeam((data ?? []) as ProfileMini[]);
  }, [organisationId]);

  const fetchPage = useCallback(
    async (
      startOffset: number,
      append: boolean,
      filters: { dateFrom: string; dateTo: string; userId: string; action: AuditAction | "" },
    ) => {
      const supabase = createClient();
      let q = supabase
        .from("audit_logs")
        .select(
          "id, organisation_id, user_id, action, resource_type, resource_id, metadata, created_at",
        )
        .eq("organisation_id", organisationId)
        .order("created_at", { ascending: false })
        .range(startOffset, startOffset + PAGE_SIZE - 1);

      if (filters.dateFrom) {
        q = q.gte("created_at", `${filters.dateFrom}T00:00:00.000Z`);
      }
      if (filters.dateTo) {
        q = q.lte("created_at", `${filters.dateTo}T23:59:59.999Z`);
      }
      if (filters.userId) {
        q = q.eq("user_id", filters.userId);
      }
      if (filters.action) {
        q = q.eq("action", filters.action);
      }

      const { data, error } = await q;
      if (error) {
        console.error("[AuditLogViewer]", error.message);
        if (!append) setRows([]);
        return;
      }

      const chunk = (data ?? []) as AuditRow[];
      if (append) {
        setRows((prev) => [...prev, ...chunk]);
      } else {
        setRows(chunk);
      }
      setHasMore(chunk.length === PAGE_SIZE);

      const ids = [...new Set(chunk.map((r) => r.user_id))];
      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", ids);
        setProfiles((prev) => {
          const next = new Map(append ? prev : new Map());
          for (const p of (profs ?? []) as ProfileMini[]) {
            next.set(p.id, p);
          }
          return next;
        });
      }
    },
    [organisationId],
  );

  useEffect(() => {
    void loadTeam();
  }, [loadTeam]);

  useEffect(() => {
    setLoading(true);
    void fetchPage(0, false, queryFilters).finally(() => setLoading(false));
  }, [organisationId, queryFilters, fetchPage]);

  const applyFilters = () => {
    setQueryFilters({
      dateFrom,
      dateTo,
      userId,
      action,
    });
  };

  const loadMore = () => {
    setLoadingMore(true);
    void fetchPage(rows.length, true, queryFilters).finally(() => setLoadingMore(false));
  };

  const userLabel = useMemo(() => {
    return (id: string) => {
      const p = profiles.get(id);
      if (!p) return id.slice(0, 8) + "…";
      const name = p.full_name?.trim() || p.email || id;
      return name;
    };
  }, [profiles]);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
      <h2 className="mb-1 text-lg font-semibold text-gray-900">Audit log</h2>
      <p className="mb-4 text-sm text-gray-500">
        Recent security and activity events for your organisation (newest first).
      </p>

      <div className="mb-4 flex flex-col gap-3 rounded-lg border border-gray-100 bg-gray-50/80 p-3 md:flex-row md:flex-wrap md:items-end">
        <div className="grid gap-1">
          <label htmlFor="audit-from" className="text-xs font-medium text-gray-600">
            From
          </label>
          <input
            id="audit-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-gray-200 px-2 py-2 text-sm"
          />
        </div>
        <div className="grid gap-1">
          <label htmlFor="audit-to" className="text-xs font-medium text-gray-600">
            To
          </label>
          <input
            id="audit-to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-gray-200 px-2 py-2 text-sm"
          />
        </div>
        <div className="grid min-w-[10rem] flex-1 gap-1">
          <label htmlFor="audit-user" className="text-xs font-medium text-gray-600">
            User
          </label>
          <select
            id="audit-user"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="rounded-lg border border-gray-200 px-2 py-2 text-sm"
          >
            <option value="">All users</option>
            {team.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name?.trim() || m.email || m.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </div>
        <div className="grid min-w-[8rem] gap-1">
          <label htmlFor="audit-action" className="text-xs font-medium text-gray-600">
            Action
          </label>
          <select
            id="audit-action"
            value={action}
            onChange={(e) => setAction(e.target.value as AuditAction | "")}
            className="rounded-lg border border-gray-200 px-2 py-2 text-sm"
          >
            <option value="">All</option>
            {ACTION_OPTIONS.filter(Boolean).map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <Button type="button" variant="secondary" className="w-full md:w-auto" onClick={applyFilters}>
          Apply filters
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
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
            {loading ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
                  No audit events match your filters.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
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
                    <span className="font-medium">{r.resource_type}</span>
                    {r.resource_id ? (
                      <span className="mt-0.5 block truncate text-xs text-gray-500" title={r.resource_id}>
                        {r.resource_id.slice(0, 12)}…
                      </span>
                    ) : null}
                  </td>
                  <td className="max-w-md px-3 py-2.5 text-xs text-gray-600">
                    {summarizeMetadata(r.metadata)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {hasMore && rows.length > 0 ? (
        <div className="mt-4 flex justify-center">
          <Button type="button" variant="outline" disabled={loadingMore} onClick={loadMore}>
            {loadingMore ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
