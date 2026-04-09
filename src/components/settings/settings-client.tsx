"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Building2,
  CheckCircle2,
  Network,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import {
  assignPracticeToPcnAction,
  createPcnAction,
  deletePcnAction,
  updatePcnAction,
  updatePracticeNameAction,
} from "@/app/actions/pcns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PcnListItem, PracticeWithPcn } from "@/lib/supabase/data";

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-base shadow-sm placeholder:text-slate-400 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 md:py-2.5 md:text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500";

const selectCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-base shadow-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 md:py-2.5 md:text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

type Props = {
  initialPcns: PcnListItem[];
  initialPractices: PracticeWithPcn[];
};

export function SettingsClient({ initialPcns, initialPractices }: Props) {
  const router = useRouter();
  const [banner, setBanner] = useState<string | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dialog state
  const [addPcnOpen, setAddPcnOpen] = useState(false);
  const [editPcn, setEditPcn] = useState<PcnListItem | null>(null);
  const [deletePcn, setDeletePcn] = useState<PcnListItem | null>(null);
  const [editPractice, setEditPractice] = useState<PracticeWithPcn | null>(
    null,
  );
  const [assignPractice, setAssignPractice] = useState<PracticeWithPcn | null>(
    null,
  );

  useEffect(() => {
    return () => {
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
    };
  }, []);

  const flash = (msg: string) => {
    setBanner(msg);
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner(null), 5000);
    router.refresh();
  };

  // Build PCN→practices map
  const pcnPractices = new Map<string, PracticeWithPcn[]>();
  const unassigned: PracticeWithPcn[] = [];
  for (const p of initialPractices) {
    if (p.pcn_name) {
      if (!pcnPractices.has(p.pcn_name)) pcnPractices.set(p.pcn_name, []);
      pcnPractices.get(p.pcn_name)!.push(p);
    } else {
      unassigned.push(p);
    }
  }

  return (
    <>
      {banner && (
        <div
          className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success"
          role="status"
        >
          <CheckCircle2 className="size-4 shrink-0" aria-hidden />
          {banner}
        </div>
      )}

      {/* PCNs with nested practices */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="text-base">
                <Network className="mr-2 inline size-4 text-primary" />
                PCNs &amp; Practices
              </CardTitle>
              <CardDescription>
                Each PCN contains one or more practices. Manage the hierarchy
                below.
              </CardDescription>
            </div>
            <Button
              type="button"
              size="sm"
              className="w-full shrink-0 sm:w-auto"
              onClick={() => setAddPcnOpen(true)}
            >
              <Plus className="size-4" aria-hidden />
              Add PCN
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {initialPcns.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              No PCNs yet. Add one to get started.
            </p>
          ) : (
            initialPcns.map((pcn) => {
              const practices = pcnPractices.get(pcn.name) ?? [];
              return (
                <div
                  key={pcn.id}
                  className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"
                >
                  {/* PCN header */}
                  <div className="flex items-center justify-between bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                        <Network className="size-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {pcn.name}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {practices.length} practice
                          {practices.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        onClick={() => setEditPcn(pcn)}
                        aria-label={`Edit ${pcn.name}`}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-slate-500 hover:text-destructive"
                        onClick={() => setDeletePcn(pcn)}
                        aria-label={`Delete ${pcn.name}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Nested practices */}
                  {practices.length === 0 ? (
                    <div className="px-4 py-4 text-center text-xs text-slate-400">
                      No practices assigned yet.
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {practices.map((pr) => (
                        <li
                          key={pr.id}
                          className="flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                        >
                          <div className="flex items-center gap-2.5">
                            <Building2 className="size-3.5 text-slate-400" />
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                              {pr.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                              onClick={() => setEditPractice(pr)}
                              aria-label={`Rename ${pr.name}`}
                            >
                              <Pencil className="size-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 text-slate-400 hover:text-amber-600"
                              onClick={() => setAssignPractice(pr)}
                              aria-label={`Reassign ${pr.name}`}
                            >
                              <Network className="size-3" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })
          )}

          {/* Unassigned practices */}
          {unassigned.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-dashed border-amber-300 dark:border-amber-700">
              <div className="bg-amber-50/60 px-4 py-3 dark:bg-amber-900/20">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  Unassigned practices
                </p>
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  These practices are not linked to any PCN.
                </p>
              </div>
              <ul className="divide-y divide-amber-100 dark:divide-amber-800/30">
                {unassigned.map((pr) => (
                  <li
                    key={pr.id}
                    className="flex items-center justify-between px-4 py-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <Building2 className="size-3.5 text-amber-500" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {pr.name}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setAssignPractice(pr)}
                    >
                      Assign to PCN
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* --- Dialogs --- */}

      <AddPcnDialog
        open={addPcnOpen}
        onOpenChange={setAddPcnOpen}
        onCreated={() => {
          setAddPcnOpen(false);
          flash("PCN added.");
        }}
      />

      <EditNameDialog
        key={editPcn?.id ?? "edit-pcn"}
        open={editPcn != null}
        onOpenChange={(o) => {
          if (!o) setEditPcn(null);
        }}
        title="Rename PCN"
        description="Update the PCN name. This also updates all linked practices."
        currentName={editPcn?.name ?? ""}
        onSave={async (name) => {
          if (!editPcn) return;
          const res = await updatePcnAction(editPcn.id, name);
          if (!res.ok) throw new Error(res.error);
          setEditPcn(null);
          flash("PCN renamed.");
        }}
      />

      <ConfirmDeleteDialog
        open={deletePcn != null}
        onOpenChange={(o) => {
          if (!o) setDeletePcn(null);
        }}
        name={deletePcn?.name ?? ""}
        description="This removes the PCN and unlinks all practices and clinicians."
        onConfirm={async () => {
          if (!deletePcn) return;
          const res = await deletePcnAction(deletePcn.id);
          if (!res.ok) throw new Error(res.error);
          setDeletePcn(null);
          flash("PCN deleted.");
        }}
      />

      <EditNameDialog
        key={editPractice?.id ?? "edit-pr"}
        open={editPractice != null}
        onOpenChange={(o) => {
          if (!o) setEditPractice(null);
        }}
        title="Rename practice"
        description="Update the practice display name."
        currentName={editPractice?.name ?? ""}
        onSave={async (name) => {
          if (!editPractice) return;
          const res = await updatePracticeNameAction(editPractice.id, name);
          if (!res.ok) throw new Error(res.error);
          setEditPractice(null);
          flash("Practice renamed.");
        }}
      />

      <AssignPcnDialog
        open={assignPractice != null}
        onOpenChange={(o) => {
          if (!o) setAssignPractice(null);
        }}
        practice={assignPractice}
        pcns={initialPcns}
        onAssigned={() => {
          setAssignPractice(null);
          flash("Practice reassigned.");
        }}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Add PCN dialog                                                     */
/* ------------------------------------------------------------------ */

function AddPcnDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setError(null);
      setBusy(false);
      formRef.current?.reset();
    }
  }, [open]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get("name") ?? "").trim();
    if (!name) {
      setError("Name is required");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await createPcnAction(name);
      if (res.ok) {
        formRef.current?.reset();
        onCreated();
      } else {
        setError(res.error);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add PCN</DialogTitle>
          <DialogDescription>
            Create a Primary Care Network. You can assign practices to it
            afterwards.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="new-pcn-name"
              className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400"
            >
              Name <span className="text-destructive">*</span>
            </label>
            <input
              id="new-pcn-name"
              name="name"
              type="text"
              required
              disabled={busy}
              placeholder="e.g. North Riverside PCN"
              className={inputCls}
              onChange={() => setError(null)}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              className="w-full sm:w-auto"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy} className="w-full sm:w-auto">
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Generic edit-name dialog (reused for PCN + practice rename)        */
/* ------------------------------------------------------------------ */

function EditNameDialog({
  open,
  onOpenChange,
  title,
  description,
  currentName,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description: string;
  currentName: string;
  onSave: (name: string) => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setError(null);
      setBusy(false);
    }
  }, [open]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = inputRef.current?.value.trim() ?? "";
    if (!name) {
      setError("Name is required");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onSave(name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={inputRef}
            type="text"
            required
            disabled={busy}
            defaultValue={currentName}
            className={inputCls}
            onChange={() => setError(null)}
          />
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              className="w-full sm:w-auto"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy} className="w-full sm:w-auto">
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Confirm delete dialog                                              */
/* ------------------------------------------------------------------ */

function ConfirmDeleteDialog({
  open,
  onOpenChange,
  name,
  description,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  name: string;
  description: string;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setBusy(false);
      setError(null);
    }
  }, [open]);

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete {name}?</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-0">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            className="w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={busy}
            className="w-full sm:w-auto"
            onClick={handleDelete}
          >
            {busy ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Assign practice to PCN dialog                                      */
/* ------------------------------------------------------------------ */

function AssignPcnDialog({
  open,
  onOpenChange,
  practice,
  pcns,
  onAssigned,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  practice: PracticeWithPcn | null;
  pcns: PcnListItem[];
  onAssigned: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setBusy(false);
      setError(null);
    }
  }, [open]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!practice) return;
    const fd = new FormData(e.currentTarget);
    const pcnName = String(fd.get("pcn_name") ?? "").trim() || null;
    setBusy(true);
    setError(null);
    try {
      const res = await assignPracticeToPcnAction(practice.id, pcnName);
      if (res.ok) {
        onAssigned();
      } else {
        setError(res.error);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign {practice?.name ?? "practice"} to PCN</DialogTitle>
          <DialogDescription>
            Choose which PCN this practice belongs to, or unassign it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <select
            name="pcn_name"
            defaultValue={practice?.pcn_name ?? ""}
            disabled={busy}
            className={selectCls}
          >
            <option value="">— No PCN (unassigned) —</option>
            {pcns.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              className="w-full sm:w-auto"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy} className="w-full sm:w-auto">
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
