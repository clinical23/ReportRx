"use client";

import { useTransition } from "react";

import { incrementTaskBatchProgressAction } from "@/app/actions/task-batches";
import { Button } from "@/components/ui/button";
import type { TaskBatch } from "@/lib/supabase/database.types";
import {
  formatDueLabel,
  getBatchDisplayStatus,
} from "@/lib/supabase/task-batch-ui";

type Props = {
  batches: TaskBatch[];
};

export function TaskBatchList({ batches }: Props) {
  const [pending, startTransition] = useTransition();

  if (batches.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No task batches yet. Add one below.
      </p>
    );
  }

  return (
    <div className="space-y-0 divide-y divide-border">
      {batches.map((batch) => {
        const status = getBatchDisplayStatus(batch);
        const canProgress =
          batch.total_tasks > 0 && batch.completed_tasks < batch.total_tasks;

        return (
          <div
            key={batch.id}
            className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">
                {batch.title}
              </p>
              <p className="text-xs text-muted-foreground">
                Due {formatDueLabel(batch.due_at)} · {batch.completed_tasks}/
                {batch.total_tasks} done
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="inline-flex rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                {status}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending || !canProgress}
                className="tabular-nums"
                onClick={() =>
                  startTransition(async () => {
                    await incrementTaskBatchProgressAction(batch.id);
                  })
                }
              >
                Complete +1
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
