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
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">
          Settings
        </h1>
        <p className="mt-1 text-sm font-normal text-slate-500 dark:text-slate-400">
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
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Practice name
            </label>
            <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {practiceName}
            </div>
          </div>
          <div className="grid gap-2">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Timezone
            </label>
            <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
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
