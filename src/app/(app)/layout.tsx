import { AppLayoutClient } from "@/components/layout/app-layout-client";
import { IdleTimeoutProvider } from "@/components/IdleTimeoutProvider";
import { getOrganisationName } from "@/lib/report/org";
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
  const orgName = await getOrganisationName(profile.organisation_id);

  const workspaceSubtitle =
    profile.role === "clinician"
      ? (profile.full_name?.trim() || profile.email?.split("@")[0] || "User")
      : orgName?.trim() || nav?.practiceName || "Practice";

  const canAccessCliniciansDirectory = profile.role !== "clinician";

  return (
    <IdleTimeoutProvider>
      <AppLayoutClient
        canAccessAdmin={profile.role === "admin" || profile.role === "superadmin"}
        canAccessCliniciansDirectory={canAccessCliniciansDirectory}
        profile={{
          full_name: profile.full_name ?? "User",
          email: profile.email ?? "",
          role: profile.role,
        }}
        workspaceSubtitle={workspaceSubtitle}
      >
        {children}
      </AppLayoutClient>
    </IdleTimeoutProvider>
  );
}
