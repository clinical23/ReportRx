import { CliniciansView } from "@/components/clinicians/clinicians-view";
import { getClinicians } from "@/lib/supabase/data";

export const dynamic = "force-dynamic";

export default async function CliniciansPage() {
  const clinicians = await getClinicians();

  return <CliniciansView clinicians={clinicians} />;
}
