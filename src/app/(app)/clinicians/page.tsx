import { redirect } from "next/navigation";

import { RegisterPageView } from "@/components/audit/register-page-view";
import { CliniciansView } from "@/components/clinicians/clinicians-view";
import { getProfile, requireRole } from "@/lib/supabase/auth";
import { listOrganisationTeamMembers } from "@/lib/supabase/data";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Team",
  description: "Directory of clinicians and team members in your organisation.",
};

export default async function CliniciansPage() {
  const profile = await getProfile();

  if (profile.role === "clinician") {
    redirect("/activity");
  }

  await requireRole(
    "manager",
    "practice_manager",
    "pcn_manager",
    "admin",
    "superadmin",
  );

  const members = await listOrganisationTeamMembers(profile.organisation_id);

  return (
    <div className="min-w-0">
      <RegisterPageView resource="clinician" />
      <CliniciansView
        members={members}
        viewerRole={profile.role}
        viewerUserId={profile.id}
      />
    </div>
  );
}
