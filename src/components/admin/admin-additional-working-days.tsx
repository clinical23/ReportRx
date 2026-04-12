"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  approveAdditionalWorkingDay,
  approveAdditionalWorkingDaysBulk,
  revokeAdditionalWorkingDay,
} from "@/app/actions/working-schedule";
import { Button } from "@/components/ui/button";
import type { OrgAdditionalWorkingDayRow } from "@/lib/supabase/admin";
import { formatDateMediumUK, formatDateTimeUK } from "@/lib/datetime";

type ClinicianOption = {
  id: string;
  full_name: string | null;
};

type Props = {
  clinicians: ClinicianOption[];
  initialRows: OrgAdditionalWorkingDayRow[];
};

export function AdminAdditionalWorkingDays({
  clinicians,
  initialRows,
}: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [clinicianId, setClinicianId] = useState(clinicians[0]?.id ?? "");
  const [workDate, setWorkDate] = useState("");
  const [reason, setReason] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [rangeClinicianId, setRangeClinicianId] = useState(
    clinicians[0]?.id ?? "",
  );
  const [rangeReason, setRangeReason] = useState("");
  const [sat, setSat] = useState(true);
  const [sun, setSun] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const approveOne = () => {
    if (!clinicianId || !workDate) return;
    startTransition(async () => {
      const r = await approveAdditionalWorkingDay({
        clinicianId,
        workDate,
        reason: reason.trim() || null,
      });
      if (!r.success) {
        alert(r.error ?? "Could not approve.");
        return;
      }
      setWorkDate("");
      setReason("");
      router.refresh();
    });
  };

  const approveRange = () => {
    if (!rangeClinicianId || !rangeStart || !rangeEnd) return;
    const iso: number[] = [];
    if (sat) iso.push(6);
    if (sun) iso.push(7);
    startTransition(async () => {
      const r = await approveAdditionalWorkingDaysBulk({
        clinicianId: rangeClinicianId,
        rangeStart,
        rangeEnd,
        isoWeekdays: iso.length > 0 ? iso : [],
        reason: rangeReason.trim() || null,
      });
      if (!r.success) {
        alert(r.error ?? "Could not approve range.");
        return;
      }
      alert(`Approved ${r.count ?? 0} day(s).`);
      setRangeReason("");
      router.refresh();
    });
  };

  const revoke = (id: string) => {
    if (!confirm("Revoke this approved day? The clinician will no longer see it as an expected working day.")) {
      return;
    }
    startTransition(async () => {
      const r = await revokeAdditionalWorkingDay(id);
      if (!r.success) {
        alert(r.error ?? "Could not revoke.");
        return;
      }
      router.refresh();
    });
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
      <h2 className="text-lg font-semibold text-gray-900">
        Additional working days (overtime)
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        Approve extra shifts (e.g. Saturday clinics). Clinicians see these days in My Week
        and they count toward reporting completeness.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4">
          <h3 className="text-sm font-semibold text-gray-900">Approve one date</h3>
          <div className="mt-3 grid gap-3">
            <label className="grid gap-1 text-xs font-medium text-gray-600">
              Clinician
              <select
                value={clinicianId}
                onChange={(e) => setClinicianId(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                {clinicians.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name?.trim() || c.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-medium text-gray-600">
              Date
              <input
                type="date"
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-gray-600">
              Reason (optional)
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Saturday flu clinic"
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <Button
              type="button"
              className="mt-1 bg-teal-600 text-white hover:bg-teal-700"
              disabled={pending || !clinicianId || !workDate}
              onClick={approveOne}
            >
              Approve
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4">
          <h3 className="text-sm font-semibold text-gray-900">Bulk: weekends in range</h3>
          <p className="mt-1 text-xs text-gray-500">
            Adds every Saturday and/or Sunday between the dates (existing approvals are
            skipped).
          </p>
          <div className="mt-3 grid gap-3">
            <label className="grid gap-1 text-xs font-medium text-gray-600">
              Clinician
              <select
                value={rangeClinicianId}
                onChange={(e) => setRangeClinicianId(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                {clinicians.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name?.trim() || c.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1 text-xs font-medium text-gray-600">
                From
                <input
                  type="date"
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="grid gap-1 text-xs font-medium text-gray-600">
                To
                <input
                  type="date"
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-gray-700">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={sat}
                  onChange={(e) => setSat(e.target.checked)}
                />
                Saturdays
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={sun}
                  onChange={(e) => setSun(e.target.checked)}
                />
                Sundays
              </label>
            </div>
            <label className="grid gap-1 text-xs font-medium text-gray-600">
              Reason (optional)
              <input
                type="text"
                value={rangeReason}
                onChange={(e) => setRangeReason(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <Button
              type="button"
              variant="outline"
              disabled={
                pending ||
                !rangeClinicianId ||
                !rangeStart ||
                !rangeEnd ||
                (!sat && !sun)
              }
              onClick={approveRange}
            >
              Approve weekends in range
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-600">
              <th className="px-4 py-2.5 font-medium">Clinician</th>
              <th className="px-4 py-2.5 font-medium">Date</th>
              <th className="px-4 py-2.5 font-medium">Reason</th>
              <th className="px-4 py-2.5 font-medium">Approved by</th>
              <th className="px-4 py-2.5 font-medium">Approved at</th>
              <th className="px-4 py-2.5 font-medium w-24"> </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  No additional days approved yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-gray-100">
                  <td className="px-4 py-2.5 text-gray-900">
                    {r.clinician_full_name ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-gray-700">
                    {formatDateMediumUK(r.work_date)}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {r.reason?.trim() || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {r.approver_full_name ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {formatDateTimeUK(r.created_at)}
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => revoke(r.id)}
                      disabled={pending}
                      className="text-xs font-medium text-red-700 hover:underline disabled:opacity-50"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
