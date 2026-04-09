"use client";

export function ReportPrintToolbar() {
  return (
    <div
      className="rr-print-hide sticky top-0 z-10 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80 print:hidden"
      style={{ WebkitBackdropFilter: "blur(8px)" }}
    >
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-teal-600 px-5 py-3 text-base font-medium text-white hover:bg-teal-700"
        >
          Print report
        </button>
        <p className="text-center text-xs text-gray-500">
          Use your browser&apos;s print dialog, then choose &quot;Save as PDF&quot;.
        </p>
      </div>
    </div>
  );
}
