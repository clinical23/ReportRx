import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <Skeleton className="h-5 w-40" />
        <div className="mt-4 space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <Skeleton className="h-5 w-44" />
        <div className="mt-4 space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}
