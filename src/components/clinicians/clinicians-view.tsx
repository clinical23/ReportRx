"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, Pencil } from "lucide-react";

import {
  addClinicianAction,
  updateClinicianAction,
} from "@/app/actions/clinicians";
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
import type { ClinicianDirectoryRow } from "@/lib/supabase/data";

const inputClassName =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type Props = {
  clinicians: ClinicianDirectoryRow[];
  practices: Practice[];
};

export function CliniciansView({ clinicians, practices }: Props) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<ClinicianDirectoryRow | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
    };
  }, []);

  const showBanner = (msg: string) => {
    setBanner(msg);
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner(null), 6000);
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
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
            Directory of providers and their linked practices.
          </p>
        </div>
        <Button
          type="button"
          className="shrink-0 self-start sm:self-auto"
          onClick={() => setAddOpen(true)}
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
            <table className="w-full min-w-[52rem] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">
                    Role
                  </th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">
                    Practices
                  </th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">
                    PCN
                  </th>
                  <th className="hidden px-4 py-3 font-medium text-muted-foreground md:table-cell">
                    Total hours (this month)
                  </th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">
                    <span className="sr-only">Actions</span>
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
                    <td className="max-w-[12rem] px-4 py-3 text-muted-foreground">
                      {c.practice_names.length > 0
                        ? c.practice_names.join(", ")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.pcn_name?.trim() ? c.pcn_name : "—"}
                    </td>
                    <td className="hidden px-4 py-3 tabular-nums text-muted-foreground md:table-cell">
                      {c.hours_this_month > 0
                        ? `${c.hours_this_month.toLocaleString("en-GB", {
                            maximumFractionDigits: 1,
                          })}h`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setEditRow(c)}
                      >
                        <Pencil className="size-3.5" aria-hidden />
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ClinicianFormDialog
        key="add"
        open={addOpen}
        onOpenChange={setAddOpen}
        mode="add"
        initial={null}
        practices={practices}
        onSaved={() => {
          setAddOpen(false);
          showBanner("Clinician added.");
        }}
      />

      <ClinicianFormDialog
        key={editRow?.id ?? "edit"}
        open={editRow != null}
        onOpenChange={(o) => {
          if (!o) setEditRow(null);
        }}
        mode="edit"
        initial={editRow}
        practices={practices}
        onSaved={() => {
          setEditRow(null);
          showBanner("Clinician updated.");
        }}
      />
    </div>
  );
}

function ClinicianFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
  practices,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  initial: ClinicianDirectoryRow | null;
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
      const result =
        mode === "add"
          ? await addClinicianAction(formData)
          : await updateClinicianAction(formData);
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

  const title = mode === "add" ? "Add clinician" : "Edit clinician";
  const description =
    mode === "add"
      ? "Create a clinician and link them to one or more practices."
      : "Update details and linked practices.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          {mode === "edit" && initial ? (
            <input type="hidden" name="id" value={initial.id} />
          ) : null}
          <div>
            <label
              htmlFor={`clinician-name-${mode}`}
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Name <span className="text-destructive">*</span>
            </label>
            <input
              id={`clinician-name-${mode}`}
              name="name"
              type="text"
              required
              autoComplete="name"
              placeholder="e.g. Dr. Jordan Kim"
              disabled={isPending}
              className={inputClassName}
              defaultValue={initial?.name ?? ""}
              onChange={() => setError(null)}
            />
          </div>
          <div>
            <label
              htmlFor={`clinician-role-${mode}`}
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Role
            </label>
            <input
              id={`clinician-role-${mode}`}
              name="role"
              type="text"
              disabled={isPending}
              className={inputClassName}
              placeholder="e.g. Clinician, Nurse"
              defaultValue={initial?.role ?? "Clinician"}
            />
          </div>
          <div>
            <label
              htmlFor={`clinician-pcn-${mode}`}
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              PCN
            </label>
            <input
              id={`clinician-pcn-${mode}`}
              name="pcn_name"
              type="text"
              disabled={isPending}
              className={inputClassName}
              placeholder="Primary care network name"
              defaultValue={initial?.pcn_name ?? ""}
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Practices
            </p>
            {practices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No practices in the directory yet.
              </p>
            ) : (
              <ul className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-border bg-muted/20 p-3">
                {practices.map((p) => {
                  const checked =
                    initial?.practice_ids.includes(p.id) ?? false;
                  return (
                    <li key={p.id} className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        name="practice_ids"
                        value={p.id}
                        id={`${mode}-practice-${p.id}`}
                        disabled={isPending}
                        defaultChecked={checked}
                        className="mt-1 rounded border-input"
                      />
                      <label
                        htmlFor={`${mode}-practice-${p.id}`}
                        className="text-sm leading-snug text-foreground"
                      >
                        {p.name}
                        {p.pcn_name ? (
                          <span className="block text-xs text-muted-foreground">
                            {p.pcn_name}
                          </span>
                        ) : null}
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
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
              {isPending ? "Saving…" : mode === "add" ? "Save" : "Update"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
