"use client";

import { useEffect, useRef, useState } from "react";
import { Menu } from "lucide-react";

type Props = {
  onMenuClick: () => void;
  fullName: string;
  signOutAction: () => Promise<void>;
};

export function MobileHeader({ onMenuClick, fullName, signOutAction }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <header className="fixed left-0 right-0 top-0 z-40 flex h-14 shrink-0 items-center border-b border-gray-200 bg-white px-3 md:hidden">
      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-11 min-h-11 w-11 min-w-11 items-center justify-center rounded-lg text-gray-700 transition-colors hover:bg-gray-100"
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6" strokeWidth={2} aria-hidden />
      </button>

      <div className="pointer-events-none absolute inset-x-0 flex justify-center">
        <span className="text-base font-semibold text-gray-900">ReportRx</span>
      </div>

      <div className="ml-auto shrink-0" ref={ref}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-11 min-h-11 w-11 min-w-11 items-center justify-center rounded-full bg-teal-100 text-sm font-medium text-teal-700 transition-colors hover:bg-teal-200/80"
          aria-expanded={menuOpen}
          aria-haspopup="true"
          aria-label="Account menu"
        >
          {initials}
        </button>

        {menuOpen ? (
          <div className="absolute right-3 top-full z-50 mt-2 w-56 rounded-xl border border-gray-200 bg-white py-2 shadow-lg">
            <p className="truncate px-4 py-1 text-sm font-medium text-gray-900">
              {fullName}
            </p>
            <form action={signOutAction}>
              <button
                type="submit"
                className="w-full px-4 py-3 text-left text-base text-gray-700 hover:bg-gray-50"
              >
                Sign out
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </header>
  );
}
