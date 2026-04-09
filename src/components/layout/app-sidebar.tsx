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
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-950">
      <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm shadow-teal-900/40">
          <Pill className="size-5" strokeWidth={2.25} aria-hidden />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold tracking-tight text-white">
            ReportRx
          </div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Clinical workspace
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
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
                "relative mx-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-slate-800 text-white before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:rounded-full before:bg-teal-400"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white",
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  active ? "text-teal-300" : "opacity-80",
                )}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 border-t border-slate-800 p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-100">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {userDisplayName}
            </p>
            {userEmail ? (
              <p className="truncate text-xs text-slate-500">{userEmail}</p>
            ) : null}
            <span className="mt-2 inline-flex max-w-full truncate rounded-full bg-teal-500/20 px-2 py-0.5 text-[11px] font-medium text-teal-300">
              {roleLabel}
            </span>
          </div>
        </div>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-lg text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
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
