import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

export type AppNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const appNavItems: AppNavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Activity", href: "/activity", icon: Activity },
  { label: "Reporting", href: "/reporting", icon: BarChart3 },
  { label: "Clinicians", href: "/clinicians", icon: Users },
  { label: "Settings", href: "/settings", icon: Settings },
];

export const appNavAdminItem: AppNavItem = {
  label: "Admin",
  href: "/admin",
  icon: ShieldCheck,
};
