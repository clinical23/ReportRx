"use client";

import { useEffect } from "react";

export function ReportPrintToolbar() {
  useEffect(() => {
    window.print();
  }, []);

  return (
    <div
      className="no-print sticky top-0 z-10 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80"
      style={{ WebkitBackdropFilter: "blur(8px)" }}
    >
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-teal-600 px-5 py-3 text-base font-medium text-white hover:bg-teal-700"
        >
          Download PDF
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg border border-gray-300 bg-white px-5 py-3 text-base font-medium text-gray-800 hover:bg-gray-50"
        >
          Print / Save as PDF
        </button>
        <p className="w-full text-center text-xs text-gray-500 md:w-auto">
          Your browser will open the print dialog. Choose &quot;Save as PDF&quot; if available.
        </p>
      </div>
    </div>
  );
}
