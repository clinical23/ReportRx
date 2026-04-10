import { Skeleton } from "@/components/ui/skeleton";

export default function ReportingLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-8 w-20" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-4 h-56 w-full" />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-4 h-56 w-full" />
        </div>
      </div>
    </div>
  );
}
