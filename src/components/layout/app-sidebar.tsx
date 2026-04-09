"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  Activity,
  ShieldCheck,
  BarChart3,
  LayoutDashboard,
  Moon,
  Pill,
  Settings,
  Stethoscope,
  Sun,
} from "lucide-react";

import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/reporting", label: "Reporting", icon: BarChart3 },
  { href: "/clinicians", label: "Clinicians", icon: Stethoscope },
  { href: "/settings", label: "Settings", icon: Settings },
];

type Props = {
  userDisplayName: string;
  userEmail: string;
  initials: string;
  roleLabel: string;
  canAccessAdmin: boolean;
};

export function AppSidebar({
  userDisplayName,
  userEmail,
  initials,
  roleLabel,
  canAccessAdmin,
}: Props) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && theme === "dark";

  const navItems = canAccessAdmin
    ? [...nav, { href: "/admin", label: "Admin", icon: ShieldCheck }]
    : nav;

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen min-h-screen shrink-0 flex-col",
        "w-[240px] min-w-[240px] max-w-[240px]",
        "border-r border-slate-200 bg-white",
        "dark:border-slate-800 dark:bg-slate-950",
      )}
    >
      <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-4 py-5 dark:border-slate-800">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm shadow-teal-900/20">
          <Pill className="size-5" strokeWidth={2.25} aria-hidden />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
            ReportRx
          </div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-500">
            Clinical workspace
          </div>
        </div>
      </div>

      <nav
        className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-3"
        aria-label="Main navigation"
      >
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex w-full min-w-0 shrink-0 flex-row items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
                active
                  ? "bg-teal-50 text-teal-800 ring-1 ring-teal-200/80 dark:bg-slate-800 dark:text-white dark:ring-slate-700"
                  : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  active
                    ? "text-teal-600 dark:text-teal-300"
                    : "text-slate-500 opacity-90 dark:opacity-80",
                )}
              />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto shrink-0 space-y-3 border-t border-slate-200 p-4 dark:border-slate-800">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-100">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
              {userDisplayName}
            </p>
            {userEmail ? (
              <p className="truncate text-xs text-slate-500 dark:text-slate-500">
                {userEmail}
              </p>
            ) : null}
            <span className="mt-2 inline-flex max-w-full truncate rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-800 ring-1 ring-teal-200/60 dark:bg-teal-500/20 dark:text-teal-300 dark:ring-teal-500/30">
              {roleLabel}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-lg text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          {mounted ? (
            isDark ? (
              <>
                <Sun className="size-4 opacity-70" />
                Light mode
              </>
            ) : (
              <>
                <Moon className="size-4 opacity-70" />
                Dark mode
              </>
            )
          ) : (
            <>
              <Moon className="size-4 opacity-70" />
              Dark mode
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
