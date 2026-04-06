"use client";

import { useActionState } from "react";

import { createTaskBatchFormAction } from "@/app/actions/task-batches";
import { Button } from "@/components/ui/button";

export function CreateTaskBatchForm() {
  const [state, formAction, isPending] = useActionState(
    createTaskBatchFormAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label
            htmlFor="title"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Title
          </label>
          <input
            id="title"
            name="title"
            required
            placeholder="e.g. April billing review"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div>
          <label
            htmlFor="total_tasks"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Total tasks
          </label>
          <input
            id="total_tasks"
            name="total_tasks"
            type="number"
            min={1}
            defaultValue={1}
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm tabular-nums ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div>
          <label
            htmlFor="due_at"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Due date (optional)
          </label>
          <input
            id="due_at"
            name="due_at"
            type="date"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>
      {state?.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating…" : "Create batch"}
      </Button>
    </form>
  );
}
