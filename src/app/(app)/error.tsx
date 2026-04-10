"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error]", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-12 text-center">
      <h1 className="text-xl font-semibold text-gray-900">Something went wrong</h1>
      <p className="mt-2 text-sm text-gray-600">
        We couldn&apos;t load this page. You can try again, or go back to the dashboard from the
        menu.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 min-h-11 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
      >
        Try again
      </button>
    </div>
  );
}
