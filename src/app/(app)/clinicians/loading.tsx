import { Skeleton } from "@/components/ui/skeleton";

export default function CliniciansLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="mb-3 h-10 w-full last:mb-0" />
        ))}
      </div>
    </div>
  );
}
