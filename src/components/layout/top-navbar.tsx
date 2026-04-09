"use client";

import { ChevronRight } from "lucide-react";

type Props = {
  practiceName: string;
};

export function TopNavbar({ practiceName }: Props) {
  return (
    <header className="flex h-14 shrink-0 items-center border-b border-gray-200 bg-white px-4 sm:px-6">
      <div
        className="flex min-w-0 items-center gap-1.5 text-sm"
        aria-label="Current practice"
      >
        <span className="hidden text-slate-500 sm:inline">Practice</span>
        <ChevronRight className="hidden size-3.5 shrink-0 text-slate-300 sm:inline" />
        <span className="truncate font-semibold text-slate-800">
          {practiceName}
        </span>
      </div>
    </header>
  );
}
