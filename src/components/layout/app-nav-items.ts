import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  LayoutDashboard,
  LifeBuoy,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

export type AppNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

/** Main app sections (excludes Settings and Support). */
export const appNavPrimaryItems: AppNavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Activity", href: "/activity", icon: Activity },
  { label: "Reporting", href: "/reporting", icon: BarChart3 },
  { label: "Clinicians", href: "/clinicians", icon: Users },
];

export const appNavSettingsItem: AppNavItem = {
  label: "Settings",
  href: "/settings",
  icon: Settings,
};

export const appNavAdminItem: AppNavItem = {
  label: "Admin",
  href: "/admin",
  icon: ShieldCheck,
};

export const appNavSupportItem: AppNavItem = {
  label: "Support",
  href: "/support",
  icon: LifeBuoy,
};

/** Primary nav + Settings (used where a flat list is needed). */
export const appNavItems: AppNavItem[] = [
  ...appNavPrimaryItems,
  appNavSettingsItem,
];
