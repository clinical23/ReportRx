import { CliniciansView } from "@/components/clinicians/clinicians-view";
import { listPractices } from "@/lib/supabase/activity";
import { getAuthProfile } from "@/lib/supabase/auth-profile";
import { listClinicianTypes } from "@/lib/supabase/clinician-types";
import { getClinicians, listPcns } from "@/lib/supabase/data";
import { getUserPermissions } from "@/lib/supabase/permissions";

export const dynamic = "force-dynamic";

export default async function CliniciansPage() {
  const session = await getAuthProfile();
  const userId = session?.user?.id ?? "";

  const [clinicians, practices, pcns, clinicianTypes, permissions] =
    await Promise.all([
      getClinicians(),
      listPractices(),
      listPcns(),
      listClinicianTypes(),
      userId ? getUserPermissions(userId) : Promise.resolve([] as string[]),
    ]);

  return (
    <div className="min-w-0">
      <CliniciansView
        clinicians={clinicians}
        practices={practices}
        pcns={pcns}
        permissions={permissions}
        clinicianTypes={clinicianTypes}
      />
    </div>
  );
}
