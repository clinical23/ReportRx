import { SettingsPageClient } from "@/components/settings/settings-page-client";
import { getProfile } from "@/lib/supabase/auth";
import { listActivityCategoriesForSettings } from "@/lib/supabase/activity";
import {
  getOrganisationSettingsRecord,
  parseDefaultHoursPerDay,
} from "@/lib/report/org";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const profile = await getProfile();

  const [orgRecord, categories] = await Promise.all([
    getOrganisationSettingsRecord(profile.organisation_id),
    listActivityCategoriesForSettings(),
  ]);

  const organisationName = orgRecord?.name?.trim() || "Organisation";
  const organisationSlug = orgRecord?.slug ?? null;
  const defaultHoursPerDay = parseDefaultHoursPerDay(orgRecord?.settings ?? null);

  const isOrgAdmin = profile.role === "admin" || profile.role === "superadmin";

  return (
    <SettingsPageClient
      profile={profile}
      organisationName={organisationName}
      organisationSlug={organisationSlug}
      defaultHoursPerDay={defaultHoursPerDay}
      isOrgAdmin={isOrgAdmin}
      categories={categories}
    />
  );
}
