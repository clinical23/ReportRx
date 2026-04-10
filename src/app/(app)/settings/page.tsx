import { SettingsPageClient } from "@/components/settings/settings-page-client";
import { getProfile } from "@/lib/supabase/auth";
import { listActivityCategoriesForSettings } from "@/lib/supabase/activity";
import {
  getOrganisationSettingsRecord,
  parseDefaultDailyHours,
  parseDefaultWeeklyHours,
} from "@/lib/report/org";
import type { Metadata } from "next";

// TODO: When organisations.mfa_required is true, force MFA enrolment for all users in that org
// For now, MFA is optional — users can enable it in Settings

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Settings",
  description: "Organisation name, default hours, and activity categories.",
};

export default async function SettingsPage() {
  const profile = await getProfile();

  const [orgRecord, categories] = await Promise.all([
    getOrganisationSettingsRecord(profile.organisation_id),
    listActivityCategoriesForSettings(),
  ]);

  const organisationName = orgRecord?.name?.trim() || "Organisation";
  const organisationSlug = orgRecord?.slug ?? null;
  const defaultDailyHours = parseDefaultDailyHours(orgRecord?.settings ?? null);
  const defaultWeeklyHours = parseDefaultWeeklyHours(orgRecord?.settings ?? null);

  const isOrgAdmin = profile.role === "admin" || profile.role === "superadmin";

  return (
    <SettingsPageClient
      profile={profile}
      organisationName={organisationName}
      organisationSlug={organisationSlug}
      defaultDailyHours={defaultDailyHours}
      defaultWeeklyHours={defaultWeeklyHours}
      isOrgAdmin={isOrgAdmin}
      categories={categories}
    />
  );
}
