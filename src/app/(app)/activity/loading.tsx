import { Skeleton } from "@/components/ui/skeleton";

export default function ActivityLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <Skeleton className="h-5 w-24" />
        <div className="mt-4 grid grid-cols-5 gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <Skeleton className="h-5 w-32" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
