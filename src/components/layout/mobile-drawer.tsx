"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { appNavAdminItem, appNavItems, type AppNavItem } from "./app-nav-items";

type Props = {
  open: boolean;
  onClose: () => void;
  workspaceSubtitle: string;
  canAccessAdmin: boolean;
  canAccessCliniciansDirectory: boolean;
  profile: {
    full_name: string;
    email: string;
    role: string;
  };
  signOutAction: () => Promise<void>;
};

function navLinkClass(active: boolean) {
  return `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
    active
      ? "bg-teal-50 text-teal-700"
      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
  }`;
}

function DrawerNavLink({
  item,
  isActive,
  onNavigate,
}: {
  item: AppNavItem;
  isActive: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  return (
    <li>
      <Link
        href={item.href}
        className={navLinkClass(isActive)}
        onClick={onNavigate}
      >
        <Icon
          className={`h-5 w-5 shrink-0 ${isActive ? "text-teal-600" : "text-gray-400"}`}
        />
        {item.label}
      </Link>
    </li>
  );
}

export function MobileDrawer({
  open,
  onClose,
  workspaceSubtitle,
  canAccessAdmin,
  canAccessCliniciansDirectory,
  profile,
  signOutAction,
}: Props) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const navItems = canAccessCliniciansDirectory
    ? appNavItems
    : appNavItems.filter((item) => item.href !== "/clinicians");
  const allItems = canAccessAdmin ? [...navItems, appNavAdminItem] : navItems;

  const roleLabels: Record<string, string> = {
    clinician: "Clinician",
    manager: "Manager",
    practice_manager: "Practice Manager",
    pcn_manager: "PCN Manager",
    admin: "Admin",
    superadmin: "Super Admin",
  };

  const initials = profile.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const id = requestAnimationFrame(() => setEntered(true));
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close menu"
        onClick={onClose}
      />

      <div
        className={`absolute left-0 top-0 flex h-full w-60 max-w-[85vw] flex-col border-r border-gray-200 bg-white shadow-xl transition-transform duration-200 ease-out ${
          entered ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
          <Link href="/" onClick={onClose} className="flex items-center gap-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600">
              <span className="text-sm font-bold text-white">Rx</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">ReportRx</p>
              <p className="text-xs text-gray-400">Clinical Workspace</p>
              <p className="mt-1 truncate text-xs font-medium text-gray-600">
                {workspaceSubtitle}
              </p>
            </div>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
          <ul className="list-none space-y-1">
            {allItems.map((item) => (
              <DrawerNavLink
                key={item.href}
                item={item}
                isActive={isActive(item.href)}
                onNavigate={onClose}
              />
            ))}
          </ul>
        </nav>

        <div className="border-t border-gray-100 px-3 py-4">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100">
              <span className="text-xs font-medium text-teal-700">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">
                {profile.full_name}
              </p>
              <p className="truncate text-xs text-gray-400">{profile.email}</p>
              <span className="mt-0.5 inline-block rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                {roleLabels[profile.role] || profile.role}
              </span>
            </div>
          </div>
          <form action={signOutAction} className="mt-2">
            <button
              type="submit"
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
