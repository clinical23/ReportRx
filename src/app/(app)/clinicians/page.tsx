import { CliniciansView } from "@/components/clinicians/clinicians-view";
import { listPractices } from "@/lib/supabase/activity";
import { getClinicians, listPcns } from "@/lib/supabase/data";

export const dynamic = "force-dynamic";

export default async function CliniciansPage() {
  const [clinicians, practices, pcns] = await Promise.all([
    getClinicians(),
    listPractices(),
    listPcns(),
  ]);

  return (
    <CliniciansView clinicians={clinicians} practices={practices} pcns={pcns} />
  );
}
