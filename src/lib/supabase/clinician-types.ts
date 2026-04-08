import { createClient } from "./server";

export async function listClinicianTypes(): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clinician_types")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    console.error("[listClinicianTypes]", error.message);
    return [];
  }

  return (data ?? []) as { id: string; name: string }[];
}
