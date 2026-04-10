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
  practiceName: string;
};

export function AppLayoutClient({
  children,
  canAccessAdmin,
  canAccessCliniciansDirectory,
  profile,
  practiceName,
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
    practiceName,
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
        practiceName={practiceName}
      />

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        practiceName={practiceName}
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
