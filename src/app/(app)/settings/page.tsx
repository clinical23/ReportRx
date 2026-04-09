import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SettingsClient } from "@/components/settings/settings-client";
import { getAuthProfile } from "@/lib/supabase/auth-profile";
import { listPcns, listPracticesWithPcn } from "@/lib/supabase/data";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getAuthProfile();
  const profile = session?.profile;

  const [pcns, practices] = await Promise.all([
    listPcns(),
    listPracticesWithPcn(),
  ]);

  let practiceName = "Not linked to a practice";
  if (profile?.practice_id) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("practices")
      .select("name")
      .eq("id", profile.practice_id)
      .maybeSingle();
    if (data?.name) practiceName = data.name;
  }

  return (
    <div className="mx-auto min-w-0 max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Settings
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Practice preferences and workspace configuration.
        </p>
      </div>

      {/* Practice info (read-only for now) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your practice</CardTitle>
          <CardDescription>
            Your linked practice and timezone.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col space-y-4">
          <div className="grid w-full gap-2">
            <label className="text-xs font-medium text-gray-600">
              Practice name
            </label>
            <div className="rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-3 text-base text-gray-900 md:py-2.5 md:text-sm">
              {practiceName}
            </div>
          </div>
          <div className="grid w-full gap-2">
            <label className="text-xs font-medium text-gray-600">
              Timezone
            </label>
            <div className="rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-3 text-base text-gray-900 md:py-2.5 md:text-sm">
              Europe/London (UK)
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PCN + Practice management */}
      <SettingsClient initialPcns={pcns} initialPractices={practices} />
    </div>
  );
}
