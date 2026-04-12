"use client";

import { Menu } from "lucide-react";

type Props = {
  onMenuClick: () => void;
  workspaceSubtitle: string;
};

export function MobileHeader({ onMenuClick, workspaceSubtitle }: Props) {
  return (
    <header className="fixed left-0 right-0 top-0 z-40 flex h-14 shrink-0 items-center border-b border-gray-200 bg-white px-3 md:hidden">
      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-11 min-h-11 w-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-gray-700 transition-colors hover:bg-gray-100"
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6" strokeWidth={2} aria-hidden />
      </button>

      <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-2 text-center">
        <span className="text-base font-semibold text-gray-900">ReportRx</span>
        {workspaceSubtitle ? (
          <span className="mt-0.5 max-w-full truncate text-xs text-gray-500">
            {workspaceSubtitle}
          </span>
        ) : null}
      </div>

      {/* Balance hamburger width — no user avatar (profile + sign-out live in the drawer) */}
      <div className="h-11 w-11 shrink-0" aria-hidden />
    </header>
  );
}
