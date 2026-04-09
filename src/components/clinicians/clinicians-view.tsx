"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { formatDateUK } from "@/lib/datetime";
import type { TeamMemberRow } from "@/lib/supabase/data";
import { formatRoleLabel } from "@/lib/role-format";
import { cn } from "@/lib/utils";

type Props = {
  members: TeamMemberRow[];
};

function roleBadgeClass(role: string): string {
  switch (role) {
    case "clinician":
      return "bg-slate-100 text-slate-800 ring-slate-200";
    case "manager":
    case "practice_manager":
    case "pcn_manager":
      return "bg-blue-50 text-blue-800 ring-blue-200";
    case "admin":
      return "bg-violet-50 text-violet-800 ring-violet-200";
    case "superadmin":
      return "bg-teal-50 text-teal-800 ring-teal-200";
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
            Organisation members, roles, and recent activity. Invite new users
            from Admin.
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

      <div className="min-w-0 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        {visible.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-gray-600">
            {members.length === 0
              ? "No team members in this organisation yet."
              : "No team members match this filter."}
          </p>
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
                      <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800 ring-1 ring-red-200 ring-inset">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-gray-700">
                    {row.last_activity_date
                      ? formatDateUK(row.last_activity_date)
                      : "Never"}
                  </td>
                  <td className="min-w-[8rem] px-4 py-3 text-gray-700">
                    {row.practices_label}
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
