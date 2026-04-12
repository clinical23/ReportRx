import type { Metadata } from "next";

import { RegisterPageView } from "@/components/audit/register-page-view";
import { SupportPageClient } from "@/components/support/support-page-client";
import { getProfile } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Support",
  description:
    "Request help from the ReportRx team and browse common questions.",
};

export default async function SupportPage() {
  await getProfile();

  return (
    <>
      <RegisterPageView resource="settings" />
      <SupportPageClient />
    </>
  );
}
