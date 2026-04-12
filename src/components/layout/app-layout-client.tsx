"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

import AppSidebar from "@/components/layout/app-sidebar";
import { MobileDrawer } from "@/components/layout/mobile-drawer";
import { MobileHeader } from "@/components/layout/mobile-header";
import { signOutAction } from "@/app/actions/auth";

type Profile = {
  full_name: string;
  email: string;
  role: string;
};

type Props = {
  children: React.ReactNode;
  canAccessAdmin: boolean;
  canAccessCliniciansDirectory: boolean;
  profile: Profile;
  /** Shown under “Clinical Workspace” (clinician: name; others: organisation or practice). */
  workspaceSubtitle: string;
};

export function AppLayoutClient({
  children,
  canAccessAdmin,
  canAccessCliniciansDirectory,
  profile,
  workspaceSubtitle,
}: Props) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (pathname?.startsWith("/mfa-verify")) {
    return (
      <div className="min-h-screen bg-[#F7F8FA]">
        {children}
      </div>
    );
  }

  const sidebarProps = {
    workspaceSubtitle,
    canAccessAdmin,
    canAccessCliniciansDirectory,
    profile,
    signOutAction,
  };

  return (
    <div className="flex min-h-screen bg-[#F7F8FA]">
      <div className="hidden shrink-0 md:flex">
        <AppSidebar {...sidebarProps} />
      </div>

      <MobileHeader
        onMenuClick={() => setDrawerOpen(true)}
        workspaceSubtitle={workspaceSubtitle}
      />

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        workspaceSubtitle={workspaceSubtitle}
        canAccessAdmin={canAccessAdmin}
        canAccessCliniciansDirectory={canAccessCliniciansDirectory}
        profile={profile}
        signOutAction={signOutAction}
      />

      <main className="min-w-0 w-full flex-1 overflow-auto pt-14 md:pt-0">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
      </main>
    </div>
  );
}
