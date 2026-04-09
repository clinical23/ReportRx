"use client";

import { useState } from "react";

import AppSidebar from "@/components/layout/app-sidebar";
import { MobileDrawer } from "@/components/layout/mobile-drawer";
import { MobileHeader } from "@/components/layout/mobile-header";
import { TopNavbar } from "@/components/layout/top-navbar";
import { signOutAction } from "@/app/actions/auth";

type Profile = {
  full_name: string;
  email: string;
  role: string;
};

type Props = {
  children: React.ReactNode;
  canAccessAdmin: boolean;
  profile: Profile;
  practiceName: string;
};

export function AppLayoutClient({
  children,
  canAccessAdmin,
  profile,
  practiceName,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const sidebarProps = {
    canAccessAdmin,
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
        fullName={profile.full_name}
        signOutAction={signOutAction}
      />

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        canAccessAdmin={canAccessAdmin}
        profile={profile}
        signOutAction={signOutAction}
      />

      <main className="min-w-0 w-full flex-1 overflow-auto pt-14 md:pt-0">
        <div className="hidden md:block">
          <TopNavbar practiceName={practiceName} />
        </div>
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
