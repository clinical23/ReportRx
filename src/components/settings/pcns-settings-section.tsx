"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";

import { createPcnAction, deletePcnAction } from "@/app/actions/pcns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PcnListItem } from "@/lib/supabase/data";

const inputClassName =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm placeholder:text-slate-400 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20";

export type PcnsSettingsSectionProps = {
  initialPcns: PcnListItem[];
  /** When set, shows which practice this settings view belongs to (PCN list is still workspace-wide). */
  practiceName?: string | null;
};

export function PcnsSettingsSection({
  initialPcns,
  practiceName,
}: PcnsSettingsSectionProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PcnListItem | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [bannerKind, setBannerKind] = useState<"success" | "error">("success");
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
    };
  }, []);

  const showBanner = (msg: string, kind: "success" | "error" = "success") => {
    setBannerKind(kind);
    setBanner(msg);
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner(null), 6000);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {banner ? (
        <div
          className={
            bannerKind === "success"
              ? "flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success"
              : "flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          }
          role="status"
        >
          {banner}
        </div>
      ) : null}

      {practiceName ? (
        <p className="text-sm text-slate-600">
          PCNs for your workspace
          <span className="font-medium text-slate-800">
            {" "}
            · {practiceName}
          </span>
        </p>
      ) : (
        <p className="text-sm text-slate-600">
          PCNs are shared across the workspace and can be linked to clinicians
          from the Clinicians page.
        </p>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm text-slate-600 sm:max-w-md">
          {initialPcns.length === 0
            ? "No PCNs yet."
            : `${initialPcns.length} PCN${initialPcns.length === 1 ? "" : "s"} configured.`}
        </p>
        <Button
          type="button"
          className="shrink-0 self-start sm:self-auto"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="size-4" aria-hidden />
          Add PCN
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {initialPcns.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-600">
            No PCNs yet. Use{" "}
            <span className="font-medium text-foreground">Add PCN</span> to
            create one.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[20rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100 text-left">
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Name
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {initialPcns.map((p, i) => (
                  <tr
                    key={p.id}
                    className={
                      i % 2 === 0
                        ? "border-b border-slate-100 bg-white hover:bg-slate-50/80"
                        : "border-b border-slate-100 bg-slate-50/70 hover:bg-slate-50"
                    }
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {p.name}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeleteTarget(p)}
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddPcnDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={() => {
          setAddOpen(false);
          showBanner("PCN added.");
        }}
      />

      <DeletePcnConfirmDialog
        pcn={deleteTarget}
        open={deleteTarget != null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        onDeleted={() => {
          const name = deleteTarget?.name;
          setDeleteTarget(null);
          showBanner(name ? `Deleted “${name}”.` : "PCN deleted.");
        }}
        onError={(err) => showBanner(err, "error")}
      />
    </div>
  );
}

function AddPcnDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
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
    const name = String(new FormData(e.currentTarget).get("name") ?? "").trim();
    if (!name) {
      setError("Name is required");
      return;
    }
    setError(null);
    setIsPending(true);
    try {
      const result = await createPcnAction(name);
      if (result.ok) {
        formRef.current?.reset();
        onCreated();
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
          <DialogTitle>Add PCN</DialogTitle>
          <DialogDescription>
            Create a Primary Care Network entry. It can be linked to clinicians
            from the Clinicians page.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="pcn-name"
              className="mb-1.5 block text-xs font-medium text-slate-600"
            >
              Name <span className="text-destructive">*</span>
            </label>
            <input
              id="pcn-name"
              name="name"
              type="text"
              required
              disabled={isPending}
              placeholder="e.g. North Riverside PCN"
              className={inputClassName}
              onChange={() => setError(null)}
            />
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

function DeletePcnConfirmDialog({
  pcn,
  open,
  onOpenChange,
  onDeleted,
  onError,
}: {
  pcn: PcnListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
  onError: (message: string) => void;
}) {
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (!open) setIsPending(false);
  }, [open]);

  async function handleDelete() {
    if (!pcn) return;
    setIsPending(true);
    try {
      const result = await deletePcnAction(pcn.id);
      if (result.ok) {
        onDeleted();
      } else {
        onError(result.error);
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete PCN</DialogTitle>
          <DialogDescription>
            {pcn ? (
              <>
                Delete <span className="font-medium text-foreground">{pcn.name}</span>?
                This removes it from the list and unlinks it from any clinicians.
              </>
            ) : (
              "This PCN will be removed."
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending || !pcn}
            onClick={handleDelete}
          >
            {isPending ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
