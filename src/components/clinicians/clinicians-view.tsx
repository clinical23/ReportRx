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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Practice } from "@/lib/supabase/activity";
import type {
  ClinicianDirectoryRow,
  PcnListItem,
} from "@/lib/supabase/data";

const inputClassName =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm placeholder:text-slate-400 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type Props = {
  clinicians: ClinicianDirectoryRow[];
  practices: Practice[];
  pcns: PcnListItem[];
};

export function CliniciansView({ clinicians, practices, pcns }: Props) {
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
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800">
            Clinicians
          </h1>
          <p className="mt-1 text-sm font-normal text-slate-600">
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

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {clinicians.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-600">
            No clinicians yet. Use{" "}
            <span className="font-medium text-slate-800">Add clinician</span>{" "}
            to create one.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100 text-left">
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Name
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Role
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Practices
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                    PCN
                  </th>
                  <th className="hidden px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500 md:table-cell">
                    Total hours (this month)
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {clinicians.map((c, i) => (
                  <tr
                    key={c.id}
                    className={
                      i % 2 === 0
                        ? "border-b border-slate-100 bg-white hover:bg-slate-50/90"
                        : "border-b border-slate-100 bg-slate-50/70 hover:bg-slate-50"
                    }
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9 shrink-0 border border-slate-200">
                          <AvatarFallback className="bg-teal-100 text-xs font-semibold text-teal-800">
                            {initialsFromName(c.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-slate-800">
                          {c.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                        {c.role}
                      </span>
                    </td>
                    <td className="max-w-[12rem] px-4 py-3 text-sm text-slate-600">
                      {c.practice_names.length > 0
                        ? c.practice_names.join(", ")
                        : "—"}
                    </td>
                    <td className="max-w-[14rem] px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.pcn_names.length > 0 ? (
                          c.pcn_names.map((n, idx) => (
                            <span
                              key={`${c.id}-pcn-${idx}`}
                              className="inline-flex rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800 ring-1 ring-teal-200/70"
                            >
                              {n}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 tabular-nums text-slate-600 md:table-cell">
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
                        size="icon"
                        className="border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        onClick={() => setEditRow(c)}
                        aria-label={`Edit ${c.name}`}
                      >
                        <Pencil className="size-4" aria-hidden />
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
        pcns={pcns}
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
        pcns={pcns}
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
  pcns,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  initial: ClinicianDirectoryRow | null;
  practices: Practice[];
  pcns: PcnListItem[];
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
              className="mb-1.5 block text-xs font-medium text-slate-600"
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
              className="mb-1.5 block text-xs font-medium text-slate-600"
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
            <p className="mb-2 text-xs font-medium text-slate-600">
              Practices
            </p>
            {practices.length === 0 ? (
              <p className="text-sm text-slate-600">
                No practices in the directory yet.
              </p>
            ) : (
              <ul className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/50 p-3">
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
                          <span className="block text-xs text-slate-500">
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
          <div>
            <p className="mb-2 text-xs font-medium text-slate-600">
              PCNs
            </p>
            {pcns.length === 0 ? (
              <p className="text-sm text-slate-600">
                No PCNs in Settings yet. Add PCNs under Settings → PCNs.
              </p>
            ) : (
              <ul className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                {pcns.map((p) => {
                  const checked =
                    initial?.pcn_ids.includes(p.id) ?? false;
                  return (
                    <li key={p.id} className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        name="pcn_ids"
                        value={p.id}
                        id={`${mode}-pcn-${p.id}`}
                        disabled={isPending}
                        defaultChecked={checked}
                        className="mt-1 rounded border-input"
                      />
                      <label
                        htmlFor={`${mode}-pcn-${p.id}`}
                        className="text-sm leading-snug text-foreground"
                      >
                        {p.name}
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
