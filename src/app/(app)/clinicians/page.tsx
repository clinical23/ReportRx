import { CliniciansView } from "@/components/clinicians/clinicians-view";
import { listPractices } from "@/lib/supabase/activity";
import { getClinicians } from "@/lib/supabase/data";

export const dynamic = "force-dynamic";

export default async function CliniciansPage() {
  const [clinicians, practices] = await Promise.all([
    getClinicians(),
    listPractices(),
  ]);

  return <CliniciansView clinicians={clinicians} practices={practices} />;
}
