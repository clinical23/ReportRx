import { AppLayoutClient } from "@/components/layout/app-layout-client";
import { getProfile } from "@/lib/supabase/auth";
import { getNavContext } from "@/lib/supabase/nav-context";
import type { Metadata } from "next";

export const metadata: Metadata = {
  description:
    "Practice operations dashboard: log activity, view reporting, and manage your primary care team.",
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  const nav = await getNavContext();

  const practiceName = nav?.practiceName ?? "ReportRx";
  const canAccessCliniciansDirectory = profile.role !== "clinician";

  return (
    <AppLayoutClient
      canAccessAdmin={profile.role === "admin" || profile.role === "superadmin"}
      canAccessCliniciansDirectory={canAccessCliniciansDirectory}
      profile={{
        full_name: profile.full_name ?? "User",
        email: profile.email ?? "",
        role: profile.role,
      }}
      practiceName={practiceName}
    >
      {children}
    </AppLayoutClient>
  );
}
