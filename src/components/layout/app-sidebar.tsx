"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

type Props = {
  canAccessAdmin: boolean;
  profile: {
    full_name: string;
    email: string;
    role: string;
  };
  signOutAction: () => Promise<void>;
};

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Activity", href: "/activity", icon: Activity },
  { label: "Reporting", href: "/reporting", icon: BarChart3 },
  { label: "Clinicians", href: "/clinicians", icon: Users },
  { label: "Settings", href: "/settings", icon: Settings },
];

const adminItem = {
  label: "Admin",
  href: "/admin",
  icon: ShieldCheck,
};

export default function AppSidebar({
  canAccessAdmin,
  profile,
  signOutAction,
}: Props) {
  const pathname = usePathname();

  const allItems = canAccessAdmin ? [...navItems, adminItem] : navItems;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const initials = profile.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const roleLabels: Record<string, string> = {
    clinician: "Clinician",
    manager: "Manager",
    admin: "Admin",
    superadmin: "Super Admin",
  };

  return (
    <aside className="flex min-h-screen w-60 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600">
            <span className="text-sm font-bold text-white">Rx</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">ReportRx</p>
            <p className="text-xs text-gray-400">Clinical Workspace</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4" aria-label="Main navigation">
        <ul className="list-none space-y-1">
          {allItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-teal-50 text-teal-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 shrink-0 ${active ? "text-teal-600" : "text-gray-400"}`}
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
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
            <span className="mt-0.5 inline-block rounded bg-teal-50 px-1.5 py-0.5 text-xs font-medium text-teal-700">
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
    </aside>
  );
}
