"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Building2, Users } from "lucide-react";

import { syncClinicianPracticeAssignments } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast-provider";
import { cn } from "@/lib/utils";

export type AdminPracticeRow = {
  id: string;
  name: string;
  pcn_id: string | null;
  pcn_name: string | null;
};

export type AdminClinicianRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type Props = {
  clinicians: AdminClinicianRow[];
  practices: AdminPracticeRow[];
  assignments: { clinician_id: string; practice_id: string }[];
  /** When true, show skeleton table (e.g. streaming shell). */
  loading?: boolean;
};

function countForClinician(
  clinicianId: string,
  assignments: { clinician_id: string; practice_id: string }[],
): number {
  return assignments.filter((a) => a.clinician_id === clinicianId).length;
}

export function AdminPracticeAssignments({
  clinicians,
  practices,
  assignments: initialAssignments,
  loading = false,
}: Props) {
  const toast = useToast();
  const [assignments, setAssignments] = useState(initialAssignments);
  const [open, setOpen] = useState(false);
  const [activeClinician, setActiveClinician] = useState<AdminClinicianRow | null>(
    null,
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setAssignments(initialAssignments);
  }, [initialAssignments]);

  const groupedPractices = useMemo(() => {
    const map = new Map<
      string,
      { label: string; items: AdminPracticeRow[] }
    >();
    for (const p of practices) {
      const key = p.pcn_id ?? "__none__";
      const label = p.pcn_name?.trim() || "No PCN";
      if (!map.has(key)) {
        map.set(key, { label, items: [] });
      } else if (key !== "__none__" && p.pcn_name?.trim()) {
        map.get(key)!.label = p.pcn_name.trim();
      }
      map.get(key)!.items.push(p);
    }
    return [...map.values()]
      .map((g) => ({
        label: g.label,
        items: [...g.items].sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [practices]);

  const openFor = (c: AdminClinicianRow) => {
    setActiveClinician(c);
    const ids = new Set(
      assignments
        .filter((a) => a.clinician_id === c.id)
        .map((a) => a.practice_id),
    );
    setSelected(ids);
    setOpen(true);
  };

  const toggle = (practiceId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(practiceId)) next.delete(practiceId);
      else next.add(practiceId);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(practices.map((p) => p.id)));
  };

  const deselectAll = () => {
    setSelected(new Set());
  };

  const save = () => {
    if (!activeClinician) return;
    startTransition(async () => {
      const r = await syncClinicianPracticeAssignments(
        activeClinician.id,
        [...selected],
      );
      if (!r.success) {
        toast.error(r.error ?? "Could not save assignments.");
        return;
      }
      toast.success("Practice assignments updated.");
      setAssignments((prev) => {
        const rest = prev.filter((a) => a.clinician_id !== activeClinician.id);
        const added = [...selected].map((practice_id) => ({
          clinician_id: activeClinician.id,
          practice_id,
        }));
        return [...rest, ...added];
      });
      setOpen(false);
      setActiveClinician(null);
    });
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
        <Skeleton className="h-7 w-48" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (clinicians.length === 0) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Practice assignments
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          No clinicians in this organisation yet. Invite clinicians first, then
          assign them to practices.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Practice assignments
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Limit which practices each clinician sees when logging activity. No
            assignments means they can use all practices.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full min-w-[20rem] text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-600">
              <th className="px-4 py-2.5 font-medium">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="size-4 text-gray-400" />
                  Clinician
                </span>
              </th>
              <th className="px-4 py-2.5 font-medium">Email</th>
              <th className="px-4 py-2.5 font-medium">Practices</th>
              <th className="px-4 py-2.5 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clinicians.map((c) => {
              const n = countForClinician(c.id, assignments);
              return (
                <tr key={c.id} className="border-t border-gray-100">
                  <td className="px-4 py-2.5 font-medium text-gray-900">
                    {c.full_name?.trim() || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {c.email?.trim() || "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                        n === 0
                          ? "bg-gray-100 text-gray-600"
                          : "bg-teal-50 text-teal-800 ring-1 ring-teal-200",
                      )}
                    >
                      {n === 0
                        ? "No practices assigned"
                        : `${n} practice${n === 1 ? "" : "s"}`}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => openFor(c)}
                      className="min-h-11 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-teal-700 transition-colors hover:bg-teal-50 md:min-h-0"
                    >
                      Assign practices
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn(
            "flex max-h-[92vh] w-[calc(100vw-2rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-xl border-gray-200 p-0",
            "left-4 top-4 translate-x-0 translate-y-0 sm:left-[50%] sm:top-[50%] sm:max-h-[85vh] sm:translate-x-[-50%] sm:translate-y-[-50%]",
          )}
        >
          <DialogHeader className="shrink-0 border-b border-gray-100 px-4 pb-3 pt-4 text-left sm:px-6">
            <DialogTitle className="pr-8 text-base sm:text-lg">
              Assign practices
            </DialogTitle>
            {activeClinician ? (
              <p className="text-sm font-medium text-gray-900">
                {activeClinician.full_name?.trim() || "Clinician"}
              </p>
            ) : null}
            <p className="text-xs text-gray-500">
              Checked practices appear in this clinician&apos;s activity log.
              Uncheck all to allow every practice.
            </p>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6">
            <div className="mb-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-9"
                onClick={selectAll}
              >
                Select all
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-9"
                onClick={deselectAll}
              >
                Deselect all
              </Button>
            </div>

            <div className="space-y-5">
              {groupedPractices.map((group) => (
                <div key={group.label}>
                  <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <Building2 className="size-3.5" />
                    {group.label}
                  </p>
                  <ul className="space-y-2 border-l-2 border-teal-100 pl-3">
                    {group.items.map((p) => (
                      <li key={p.id}>
                        <label className="flex cursor-pointer items-center gap-3 rounded-lg py-1.5 pl-1 hover:bg-gray-50">
                          <input
                            type="checkbox"
                            className="size-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                            checked={selected.has(p.id)}
                            onChange={() => toggle(p.id)}
                          />
                          <span className="text-sm text-gray-800">
                            {p.name}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t border-gray-100 bg-white px-4 py-3 sm:px-6">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full sm:w-auto"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="min-h-11 w-full bg-teal-600 text-white hover:bg-teal-700 sm:w-auto"
              disabled={pending}
              onClick={save}
            >
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
