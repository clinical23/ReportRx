import { redirect } from "next/navigation";

import { CliniciansView } from "@/components/clinicians/clinicians-view";
import { getProfile, requireRole } from "@/lib/supabase/auth";
import { listOrganisationTeamMembers } from "@/lib/supabase/data";

export const dynamic = "force-dynamic";

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
      <CliniciansView members={members} />
    </div>
  );
}
