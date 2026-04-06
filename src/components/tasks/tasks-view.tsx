"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";

import { createTask } from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  Clinician,
  Task,
  TaskWithClinician,
} from "@/lib/supabase/database.types";
import { formatDateTimeUK } from "@/lib/datetime";

const inputClassName =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const selectClassName =
  "w-full appearance-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type Props = {
  tasks: TaskWithClinician[];
  clinicians: Clinician[];
};

export function TasksView({ tasks: initialTasks, clinicians }: Props) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [open, setOpen] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    return () => {
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
    };
  }, []);

  const showSuccess = () => {
    setBanner("Task added.");
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner(null), 6000);
    router.refresh();
  };

  const mergeCreatedTask = (task: Task, clinicianId: string) => {
    const clinician = clinicians.find((c) => c.id === clinicianId);
    setTasks((prev) => {
      const rest = prev.filter((t) => t.id !== task.id);
      return [
        {
          ...task,
          clinicians: clinician ? { name: clinician.name } : { name: "—" },
        },
        ...rest,
      ];
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {banner ? (
        <div
          className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success"
          role="status"
        >
          <CheckCircle2 className="size-4 shrink-0" aria-hidden />
          {banner}
        </div>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Tasks
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track work items assigned to clinicians.
          </p>
        </div>
        <Button
          type="button"
          className="shrink-0 self-start sm:self-auto"
          onClick={() => setOpen(true)}
          disabled={clinicians.length === 0}
        >
          Add task
        </Button>
      </div>

      {clinicians.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Add at least one clinician before creating tasks.
        </p>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-stripe">
        {tasks.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No tasks yet. Use{" "}
            <span className="font-medium text-foreground">Add task</span> to
            create one.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">
                    Title
                  </th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">
                    Clinician
                  </th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="hidden px-4 py-3 font-medium text-muted-foreground md:table-cell">
                    Created at
                  </th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {t.title}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {t.clinicians?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                        {t.status}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 tabular-nums text-muted-foreground md:table-cell">
                      {formatDateTimeUK(t.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Data loads from Supabase. Tighten Row Level Security when you add
            authentication.
          </p>
        </CardContent>
      </Card>

      <AddTaskDialog
        open={open}
        onOpenChange={setOpen}
        clinicians={clinicians}
        onTaskCreated={(task, clinicianId) => {
          setOpen(false);
          mergeCreatedTask(task, clinicianId);
          showSuccess();
        }}
      />
    </div>
  );
}

function AddTaskDialog({
  open,
  onOpenChange,
  clinicians,
  onTaskCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicians: Clinician[];
  onTaskCreated: (task: Task, clinicianId: string) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (!open) {
      setError(null);
      setIsPending(false);
      formRef.current?.reset();
    }
  }, [open]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const title = String(fd.get("title") ?? "").trim();
    const clinician_id = String(fd.get("clinician_id") ?? "").trim();

    if (!title) {
      setError("Title is required");
      return;
    }
    if (!clinician_id) {
      setError("Clinician is required");
      return;
    }

    setError(null);
    setIsPending(true);
    try {
      const result = await createTask(fd);
      if (result.ok) {
        form.reset();
        onTaskCreated(result.task, clinician_id);
      } else {
        setError(result.error);
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add task</DialogTitle>
          <DialogDescription>
            New tasks start as <span className="font-medium">Open</span>.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="task-title"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Title <span className="text-destructive">*</span>
            </label>
            <input
              id="task-title"
              name="title"
              type="text"
              required
              placeholder="e.g. Follow up on intake"
              disabled={isPending}
              className={inputClassName}
              onChange={() => setError(null)}
            />
          </div>
          <div>
            <label
              htmlFor="task-clinician"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Clinician <span className="text-destructive">*</span>
            </label>
            <select
              id="task-clinician"
              name="clinician_id"
              required
              defaultValue=""
              disabled={isPending}
              className={selectClassName}
              onChange={() => setError(null)}
            >
              <option value="" disabled>
                Select a clinician
              </option>
              {clinicians.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
