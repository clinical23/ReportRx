"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatDateUK } from "@/lib/datetime";
import type { TeamMemberRow } from "@/lib/supabase/data";
import { formatRoleLabel } from "@/lib/role-format";
import { cn } from "@/lib/utils";

type Props = {
  members: TeamMemberRow[];
};

function practicesDisplay(row: TeamMemberRow) {
  if (row.clinician_assignment) {
    if (!row.clinician_assignment.restricted) {
      return (
        <span className="text-gray-400">All practices</span>
      );
    }
    return row.clinician_assignment.names_csv || "—";
  }
  return row.practices_label;
}

function roleBadgeClass(role: string): string {
  switch (role) {
    case "clinician":
      return "bg-slate-100 text-slate-800 ring-slate-200";
    case "manager":
    case "practice_manager":
    case "pcn_manager":
      return "bg-teal-50 text-teal-800 ring-teal-200";
    case "admin":
      return "bg-blue-50 text-blue-800 ring-blue-200";
    case "superadmin":
      return "bg-purple-50 text-purple-800 ring-purple-200";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

export function CliniciansView({ members }: Props) {
  const [showInactive, setShowInactive] = useState(false);

  const visible = useMemo(() => {
    if (showInactive) return members;
    return members.filter((m) => m.is_active);
  }, [members, showInactive]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Team</h1>
          <p className="mt-1 text-sm text-gray-500">
            View and manage your clinical team members.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <Button
            asChild
            className="w-full bg-teal-600 text-white hover:bg-teal-700 sm:w-auto"
          >
            <Link href="/admin">Invite team members</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Show inactive users
        </label>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm md:hidden">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
            <Users className="h-5 w-5 text-gray-400" />
            <p className="text-sm text-gray-600">
              {members.length === 0
                ? "No team members yet. Invite your first clinician from the Admin page."
                : "No team members match this filter."}
            </p>
            {members.length === 0 ? (
              <Link href="/admin" className="text-sm font-medium text-teal-700 hover:underline">
                Go to Admin
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3 p-3">
            {visible.map((row) => (
              <div key={row.id} className="rounded-xl border border-gray-200 bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{row.full_name}</p>
                    <p className="truncate text-sm text-gray-600">{row.email}</p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                      roleBadgeClass(row.role),
                    )}
                  >
                    {formatRoleLabel(row.role)}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                  {row.is_active ? (
                    <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800 ring-1 ring-emerald-200 ring-inset">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-800 ring-1 ring-amber-200 ring-inset">
                      Inactive
                    </span>
                  )}
                  <span>Last: {row.last_activity_date ? formatDateUK(row.last_activity_date) : "Never"}</span>
                </div>
                <p className="mt-2 text-xs text-gray-600">
                  Practices: {practicesDisplay(row)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="hidden min-w-0 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm md:block">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
            <Users className="h-5 w-5 text-gray-400" />
            <p className="text-sm text-gray-600">
              {members.length === 0
                ? "No team members yet. Invite your first clinician from the Admin page."
                : "No team members match this filter."}
            </p>
            {members.length === 0 ? (
              <Link href="/admin" className="text-sm font-medium text-teal-700 hover:underline">
                Go to Admin
              </Link>
            ) : null}
          </div>
        ) : (
          <table className="w-full min-w-[44rem] text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-medium text-gray-500">
                  Name
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">
                  Email
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">
                  Role
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">
                  Last activity
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">
                  Practices
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {row.full_name}
                  </td>
                  <td className="max-w-[12rem] truncate px-4 py-3 text-gray-700">
                    {row.email}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                        roleBadgeClass(row.role),
                      )}
                    >
                      {formatRoleLabel(row.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {row.is_active ? (
                      <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200 ring-inset">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200 ring-inset">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-gray-700">
                    {row.last_activity_date
                      ? formatDateUK(row.last_activity_date)
                      : "Never"}
                  </td>
                  <td className="min-w-[8rem] max-w-[14rem] px-4 py-3 text-gray-700">
                    {practicesDisplay(row)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
