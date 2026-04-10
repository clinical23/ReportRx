import { Skeleton } from "@/components/ui/skeleton";

export default function ActivityDayLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Skeleton className="h-9 w-48" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-3 h-8 w-20" />
          </div>
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
