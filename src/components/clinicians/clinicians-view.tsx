"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";

import { addClinicianAction } from "@/app/actions/clinicians";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Practice } from "@/lib/supabase/activity";
import type { ClinicianWithPractice } from "@/lib/supabase/data";

const inputClassName =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const selectClassName =
  "w-full appearance-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type Props = {
  clinicians: ClinicianWithPractice[];
  practices: Practice[];
};

export function CliniciansView({ clinicians, practices }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
    };
  }, []);

  const showSuccess = () => {
    setBanner("Clinician added.");
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner(null), 6000);
    router.refresh();
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
            Clinicians
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Directory of providers linked to your practice.
          </p>
        </div>
        <Button
          type="button"
          className="shrink-0 self-start sm:self-auto"
          onClick={() => setOpen(true)}
        >
          Add clinician
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-stripe">
        {clinicians.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No clinicians yet. Use{" "}
            <span className="font-medium text-foreground">Add clinician</span>{" "}
            to create one.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">
                    Role
                  </th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">
                    Practice
                  </th>
                  <th className="hidden px-4 py-3 font-medium text-muted-foreground sm:table-cell">
                    Active caseload
                  </th>
                </tr>
              </thead>
              <tbody>
                {clinicians.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {c.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.role}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.practice_name ?? "—"}
                    </td>
                    <td className="hidden px-4 py-3 tabular-nums text-muted-foreground sm:table-cell">
                      {c.active_caseload}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddClinicianDialog
        open={open}
        onOpenChange={setOpen}
        practices={practices}
        onSaved={() => {
          setOpen(false);
          showSuccess();
        }}
      />
    </div>
  );
}

function AddClinicianDialog({
  open,
  onOpenChange,
  practices,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  practices: Practice[];
  onSaved: () => void;
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
    const name = String(new FormData(form).get("name") ?? "").trim();
    if (!name) {
      setError("Name is required");
      return;
    }

    setError(null);
    setIsPending(true);
    const formData = new FormData(form);
    try {
      const result = await addClinicianAction(formData);
      if (result.ok) {
        form.reset();
        onSaved();
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
          <DialogTitle>Add clinician</DialogTitle>
          <DialogDescription>
            New clinicians default to role &quot;Clinician&quot; with zero active
            caseload. Optionally assign a practice.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="clinician-name"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Name <span className="text-destructive">*</span>
            </label>
            <input
              id="clinician-name"
              name="name"
              type="text"
              required
              autoComplete="name"
              placeholder="e.g. Dr. Jordan Kim"
              disabled={isPending}
              className={inputClassName}
              onChange={() => setError(null)}
            />
          </div>
          <div>
            <label
              htmlFor="clinician-practice"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Practice
            </label>
            <select
              id="clinician-practice"
              name="practice_id"
              disabled={isPending || practices.length === 0}
              className={selectClassName}
            >
              <option value="">Not set</option>
              {practices.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {practices.length === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                No practices in the directory yet.
              </p>
            ) : null}
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
