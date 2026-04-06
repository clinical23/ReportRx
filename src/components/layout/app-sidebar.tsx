"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  LayoutDashboard,
  LogOut,
  Stethoscope,
  Settings,
} from "lucide-react";

import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/clinicians", label: "Clinicians", icon: Stethoscope },
  { href: "/settings", label: "Settings", icon: Settings },
];

type Props = {
  userLine: string;
};

export function AppSidebar({ userLine }: Props) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-56 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center px-5">
        <span className="text-sm font-semibold tracking-tight text-foreground">
          ReportRx
        </span>
      </div>
      <Separator />
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
        {nav.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-4 shrink-0 opacity-70" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto space-y-3 border-t border-border p-3">
        <p className="px-1 text-xs leading-snug text-muted-foreground">{userLine}</p>
        <form action={signOut}>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="w-full justify-center gap-2 text-muted-foreground"
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  );
}
