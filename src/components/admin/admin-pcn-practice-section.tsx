"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ChevronDown,
  Pencil,
  Plus,
  RotateCcw,
} from "lucide-react";

import {
  createPCN,
  createPractice,
  setPcnActiveFlag,
  setPracticeActiveFlag,
  updatePcnDetails,
  updatePracticeDetails,
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
import type { AdminPCN, AdminPractice } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

type Props = {
  organisationId: string;
  pcns: AdminPCN[];
  practices: AdminPractice[];
};

function rowShowsAsActive(isActive: boolean | null | undefined): boolean {
  return isActive !== false;
}

export function AdminPcnPracticeSection({
  organisationId,
  pcns,
  practices,
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [showInactive, setShowInactive] = useState(false);

  const [pcnEdit, setPcnEdit] = useState<AdminPCN | null>(null);
  const [pcnNameDraft, setPcnNameDraft] = useState("");
  const [practiceEdit, setPracticeEdit] = useState<AdminPractice | null>(null);
  const [practiceNameDraft, setPracticeNameDraft] = useState("");
  const [practicePcnDraft, setPracticePcnDraft] = useState<string>("");

  const visiblePcns = useMemo(
    () =>
      showInactive ? pcns : pcns.filter((p) => rowShowsAsActive(p.is_active)),
    [pcns, showInactive],
  );

  const practicesByPcn = useMemo(() => {
    const m = new Map<string | null, AdminPractice[]>();
    for (const pr of practices) {
      const key = pr.pcn_id ?? null;
      const list = m.get(key) ?? [];
      list.push(pr);
      m.set(key, list);
    }
    for (const list of m.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return m;
  }, [practices]);

  const unassigned = useMemo(() => {
    const list = practicesByPcn.get(null) ?? [];
    return showInactive ? list : list.filter((p) => rowShowsAsActive(p.is_active));
  }, [practicesByPcn, showInactive]);

  const openPcnEdit = (pcn: AdminPCN) => {
    setPcnEdit(pcn);
    setPcnNameDraft(pcn.name);
  };

  const openPracticeEdit = (p: AdminPractice) => {
    setPracticeEdit(p);
    setPracticeNameDraft(p.name);
    setPracticePcnDraft(p.pcn_id ?? "");
  };

  const savePcn = () => {
    if (!pcnEdit) return;
    startTransition(async () => {
      const r = await updatePcnDetails({
        pcnId: pcnEdit.id,
        name: pcnNameDraft,
      });
      if (!r.success) {
        toast.error(r.error ?? "Could not save PCN.");
        return;
      }
      toast.success("PCN updated.");
      setPcnEdit(null);
      router.refresh();
    });
  };

  const savePractice = () => {
    if (!practiceEdit) return;
    startTransition(async () => {
      const r = await updatePracticeDetails({
        practiceId: practiceEdit.id,
        name: practiceNameDraft,
        pcnId: practicePcnDraft.trim() === "" ? null : practicePcnDraft.trim(),
      });
      if (!r.success) {
        toast.error(r.error ?? "Could not save practice.");
        return;
      }
      toast.success("Practice updated.");
      setPracticeEdit(null);
      router.refresh();
    });
  };

  const togglePcnActive = (pcn: AdminPCN, next: boolean) => {
    const label = next ? "reactivate" : "archive";
    if (
      !window.confirm(
        `Are you sure you want to ${label} PCN "${pcn.name}"? Practices under it remain but hidden from default lists when archived.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const r = await setPcnActiveFlag({ pcnId: pcn.id, isActive: next });
      if (!r.success) {
        toast.error(r.error ?? "Could not update PCN.");
        return;
      }
      toast.success(next ? "PCN reactivated." : "PCN archived.");
      router.refresh();
    });
  };

  const togglePracticeActive = (p: AdminPractice, next: boolean) => {
    const label = next ? "reactivate" : "archive";
    if (
      !window.confirm(
        `Are you sure you want to ${label} practice "${p.name}"?`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const r = await setPracticeActiveFlag({
        practiceId: p.id,
        isActive: next,
      });
      if (!r.success) {
        toast.error(r.error ?? "Could not update practice.");
        return;
      }
      toast.success(next ? "Practice reactivated." : "Practice archived.");
      router.refresh();
    });
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-gray-900">PCNs &amp; practices</h2>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Show archived
        </label>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <form
          action={createPCN}
          className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-gray-50/80 p-4"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Add PCN
          </p>
          <input type="hidden" name="organisation_id" value={organisationId} />
          <input
            type="text"
            name="name"
            required
            placeholder="PCN name"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <Button type="submit" size="sm" className="w-full bg-teal-600 hover:bg-teal-700 sm:w-auto">
            <Plus className="mr-1.5 h-4 w-4" />
            Add PCN
          </Button>
        </form>

        <form
          action={createPractice}
          className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-gray-50/80 p-4"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Add practice
          </p>
          <input type="hidden" name="organisation_id" value={organisationId} />
          <input
            type="text"
            name="name"
            required
            placeholder="Practice name"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <select
            name="pcn_id"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            defaultValue=""
          >
            <option value="">No PCN</option>
            {pcns
              .filter((p) => rowShowsAsActive(p.is_active))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
          <Button type="submit" size="sm" className="w-full bg-teal-600 hover:bg-teal-700 sm:w-auto">
            <Plus className="mr-1.5 h-4 w-4" />
            Add practice
          </Button>
        </form>
      </div>

      <div className="space-y-2">
        {visiblePcns.map((pcn) => {
          const nested = (practicesByPcn.get(pcn.id) ?? []).filter((pr) =>
            showInactive ? true : rowShowsAsActive(pr.is_active),
          );
          return (
            <details
              key={pcn.id}
              className="group rounded-xl border border-gray-200 bg-white open:bg-gray-50/30"
              open
            >
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 px-3 py-3 text-sm font-medium text-gray-900 marker:hidden [&::-webkit-details-marker]:hidden">
                <ChevronDown className="h-4 w-4 shrink-0 text-gray-500 transition-transform group-open:rotate-180" />
                <span className="min-w-0 flex-1">{pcn.name}</span>
                {!rowShowsAsActive(pcn.is_active) ? (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800 ring-1 ring-amber-200">
                    Archived
                  </span>
                ) : null}
                <span className="text-xs font-normal text-gray-500">
                  {nested.length} practice{nested.length !== 1 ? "s" : ""}
                </span>
                <span className="ml-auto flex flex-wrap items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    disabled={pending}
                    onClick={(e) => {
                      e.preventDefault();
                      openPcnEdit(pcn);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {rowShowsAsActive(pcn.is_active) ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 text-red-700 hover:bg-red-50"
                      disabled={pending}
                      onClick={(e) => {
                        e.preventDefault();
                        togglePcnActive(pcn, false);
                      }}
                    >
                      <Archive className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 px-2"
                      disabled={pending}
                      onClick={(e) => {
                        e.preventDefault();
                        togglePcnActive(pcn, true);
                      }}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </span>
              </summary>
              <div className="border-t border-gray-100 px-3 py-2">
                {nested.length === 0 ? (
                  <p className="py-2 text-xs text-gray-500">No practices in this PCN.</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {nested.map((pr) => (
                      <li
                        key={pr.id}
                        className="flex flex-wrap items-center gap-2 py-2 text-sm"
                      >
                        <span className="min-w-0 flex-1 text-gray-800">{pr.name}</span>
                        {!rowShowsAsActive(pr.is_active) ? (
                          <span className="text-xs text-amber-700">Archived</span>
                        ) : null}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2"
                          disabled={pending}
                          onClick={() => openPracticeEdit(pr)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {rowShowsAsActive(pr.is_active) ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 text-red-700 hover:bg-red-50"
                            disabled={pending}
                            onClick={() => togglePracticeActive(pr, false)}
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 px-2"
                            disabled={pending}
                            onClick={() => togglePracticeActive(pr, true)}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </details>
          );
        })}
      </div>

      {unassigned.length > 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-4">
          <p className="mb-2 text-sm font-medium text-gray-800">
            Practices without a PCN
          </p>
          <ul className="divide-y divide-gray-200">
            {unassigned.map((pr) => (
              <li
                key={pr.id}
                className="flex flex-wrap items-center gap-2 py-2 text-sm"
              >
                <span className="min-w-0 flex-1">{pr.name}</span>
                {!rowShowsAsActive(pr.is_active) ? (
                  <span className="text-xs text-amber-700">Archived</span>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2"
                  disabled={pending}
                  onClick={() => openPracticeEdit(pr)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Dialog open={Boolean(pcnEdit)} onOpenChange={(o) => !o && setPcnEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit PCN</DialogTitle>
          </DialogHeader>
          <label className="grid gap-1 text-sm">
            <span className="text-gray-600">Name</span>
            <input
              value={pcnNameDraft}
              onChange={(e) => setPcnNameDraft(e.target.value)}
              className={cn(
                "rounded-lg border border-gray-200 px-3 py-2",
              )}
            />
          </label>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setPcnEdit(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-teal-600 hover:bg-teal-700"
              disabled={pending || !pcnNameDraft.trim()}
              onClick={savePcn}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(practiceEdit)}
        onOpenChange={(o) => !o && setPracticeEdit(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit practice</DialogTitle>
          </DialogHeader>
          <label className="grid gap-1 text-sm">
            <span className="text-gray-600">Name</span>
            <input
              value={practiceNameDraft}
              onChange={(e) => setPracticeNameDraft(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2"
            />
          </label>
          <label className="mt-3 grid gap-1 text-sm">
            <span className="text-gray-600">PCN</span>
            <select
              value={practicePcnDraft}
              onChange={(e) => setPracticePcnDraft(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2"
            >
              <option value="">No PCN</option>
              {pcns
                .filter((p) => rowShowsAsActive(p.is_active))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </label>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPracticeEdit(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-teal-600 hover:bg-teal-700"
              disabled={pending || !practiceNameDraft.trim()}
              onClick={savePractice}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
