import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PcnsSettingsSection } from "@/components/settings/pcns-settings-section";
import { Separator } from "@/components/ui/separator";
import { getAuthProfile } from "@/lib/supabase/auth-profile";
import { listPcns } from "@/lib/supabase/data";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getAuthProfile();
  const profile = session?.profile;

  const pcns = await listPcns();

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
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Practice preferences and workspace defaults.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Practice</CardTitle>
          <CardDescription>
            Display name and timezone used across the app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <label className="text-xs font-medium text-muted-foreground">
              Practice name
            </label>
            <div className="rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground">
              {practiceName}
            </div>
          </div>
          <Separator />
          <div className="grid gap-2">
            <label className="text-xs font-medium text-muted-foreground">
              Timezone
            </label>
            <div className="rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground">
              Europe/London (UK)
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">PCNs</CardTitle>
          <CardDescription>
            Primary Care Networks used when assigning clinicians. Deleting a PCN
            removes it from the list and unlinks it from any clinicians.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PcnsSettingsSection
            initialPcns={pcns}
            practiceName={
              profile?.practice_id &&
              practiceName !== "Not linked to a practice"
                ? practiceName
                : null
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notifications</CardTitle>
          <CardDescription>
            Email summaries and report deadlines.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Notification toggles can be wired to your backend or a provider
            later; this panel matches the layout you will extend.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
