import { createClient } from "@/lib/supabase/server";

export async function getOrganisationName(
  organisationId: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organisations")
    .select("name")
    .eq("id", organisationId)
    .maybeSingle();

  if (error) {
    console.error("[getOrganisationName]", error.message);
    return null;
  }
  return data?.name?.trim() || null;
}
