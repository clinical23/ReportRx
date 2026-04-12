"use client";

import { useEffect, useState, useTransition } from "react";
import { CalendarRange } from "lucide-react";
import { useRouter } from "next/navigation";

import { updateClinicianWorkingDays } from "@/app/actions/working-schedule";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast-provider";
import { normalizeWorkingDays } from "@/lib/working-pattern";
import { cn } from "@/lib/utils";

const ISO_DAYS = [
  { iso: 1, label: "Mon" },
  { iso: 2, label: "Tue" },
  { iso: 3, label: "Wed" },
  { iso: 4, label: "Thu" },
  { iso: 5, label: "Fri" },
  { iso: 6, label: "Sat" },
  { iso: 7, label: "Sun" },
] as const;

type Member = {
  id: string;
  full_name: string | null;
  working_days: number[] | null;
};

type Props = {
  member: Member;
};

export function AdminWorkingPatternModal({ member }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(normalizeWorkingDays(member.working_days)),
  );
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setSelected(new Set(normalizeWorkingDays(member.working_days)));
    }
  }, [open, member.working_days]);

  const toggle = (iso: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(iso)) next.delete(iso);
      else next.add(iso);
      return next;
    });
  };

  const save = () => {
    const days = [...selected].sort((a, b) => a - b);
    if (days.length === 0) {
      toast.error("Select at least one day.");
      return;
    }
    startTransition(async () => {
      const r = await updateClinicianWorkingDays(member.id, days);
      if (!r.success) {
        toast.error(r.error ?? "Could not save.");
        return;
      }
      toast.success("Working pattern saved.");
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
        title="Edit working pattern"
      >
        <CalendarRange className="size-3.5 shrink-0 text-teal-600" aria-hidden />
        <span className="hidden sm:inline">Pattern</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Working pattern</DialogTitle>
            <p className="text-sm text-gray-500">
              {member.full_name?.trim() || "Clinician"} — select their usual working
              days (used for My Week and reporting completeness).
            </p>
          </DialogHeader>

          <div className="grid grid-cols-7 gap-2 py-2">
            {ISO_DAYS.map(({ iso, label }) => {
              const on = selected.has(iso);
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => toggle(iso)}
                  className={cn(
                    "rounded-lg border px-1 py-2.5 text-center text-xs font-semibold transition-colors",
                    on
                      ? "border-teal-600 bg-teal-600 text-white"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-teal-600 text-white hover:bg-teal-700"
              disabled={pending || selected.size === 0}
              onClick={save}
            >
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
