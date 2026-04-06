import type { TaskBatch } from "./database.types";

import { UK_TIMEZONE } from "@/lib/datetime";

export function formatDueLabel(dueAt: string | null): string {
  if (!dueAt) return "No due date";

  const d = new Date(dueAt);
  if (Number.isNaN(d.getTime())) return "No due date";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";

  return d.toLocaleDateString("en-GB", {
    timeZone: UK_TIMEZONE,
    day: "2-digit",
    month: "short",
    year:
      d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

export function getBatchDisplayStatus(batch: TaskBatch): string {
  if (batch.total_tasks <= 0) return "Empty";
  if (batch.completed_tasks >= batch.total_tasks) return "Complete";
  if (batch.completed_tasks > 0) return "In progress";

  if (batch.due_at) {
    const due = new Date(batch.due_at);
    if (!Number.isNaN(due.getTime()) && due.getTime() > Date.now()) {
      return "Scheduled";
    }
  }

  return "Pending";
}
