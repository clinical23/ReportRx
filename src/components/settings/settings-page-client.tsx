"use client";

import {
  useEffect,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";

import {
  archiveCategory,
  createCategory,
  reorderCategory,
  unarchiveCategory,
  updateCategory,
  updateOrganisation,
  updateProfile,
} from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatRoleLabel } from "@/lib/role-format";
import type { ActivityCategorySettingsRow } from "@/lib/supabase/activity";
import type { Profile } from "@/lib/supabase/auth";
import { cn } from "@/lib/utils";

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm focus-visible:border-teal-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/20";

type Props = {
  profile: Profile;
  organisationName: string;
  organisationSlug: string | null;
  defaultDailyHours: number;
  defaultWeeklyHours: number;
  isOrgAdmin: boolean;
  categories: ActivityCategorySettingsRow[];
};

function roleBadgeClass(role: string): string {
  switch (role) {
    case "clinician":
      return "bg-slate-100 text-slate-800 ring-slate-200";
    case "manager":
    case "practice_manager":
    case "pcn_manager":
      return "bg-teal-50 text-teal-800 ring-teal-200";
    case "admin":
      return "bg-blue-50 text-blue-800 ring-blue-200";
    case "superadmin":
      return "bg-purple-50 text-purple-800 ring-purple-200";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

export function SettingsPageClient({
  profile,
  organisationName,
  organisationSlug,
  defaultDailyHours,
  defaultWeeklyHours,
  isOrgAdmin,
  categories: initialCategories,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [profileFlash, setProfileFlash] = useState<{ message: string; ok: boolean } | null>(null);
  const [orgFlash, setOrgFlash] = useState<{ message: string; ok: boolean } | null>(null);
  const [catFlash, setCatFlash] = useState<{ message: string; ok: boolean } | null>(null);

  const [orgName, setOrgName] = useState(organisationName);
  const [orgDailyHours, setOrgDailyHours] = useState(String(defaultDailyHours));
  const [orgWeeklyHours, setOrgWeeklyHours] = useState(
    String(defaultWeeklyHours),
  );

  const [newCatName, setNewCatName] = useState("");
  const [renameValues, setRenameValues] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(initialCategories.map((c) => [c.id, c.name])) as Record<
        string,
        string
      >,
  );

  useEffect(() => {
    setRenameValues(
      Object.fromEntries(initialCategories.map((c) => [c.id, c.name])) as Record<
        string,
        string
      >,
    );
  }, [initialCategories]);

  useEffect(() => {
    setOrgName(organisationName);
    setOrgDailyHours(String(defaultDailyHours));
    setOrgWeeklyHours(String(defaultWeeklyHours));
  }, [organisationName, defaultDailyHours, defaultWeeklyHours]);

  const submitProfile = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setProfileFlash(null);
    startTransition(async () => {
      const r = await updateProfile(fd);
      setProfileFlash(r.success ? { message: "Profile saved.", ok: true } : { message: r.error, ok: false });
      if (r.success) router.refresh();
    });
  };

  const submitOrg = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData();
    fd.set("name", orgName.trim());
    fd.set(
      "default_daily_hours",
      orgDailyHours.trim() || String(defaultDailyHours),
    );
    fd.set(
      "default_weekly_hours",
      orgWeeklyHours.trim() || String(defaultWeeklyHours),
    );
    setOrgFlash(null);
    startTransition(async () => {
      const r = await updateOrganisation(fd);
      setOrgFlash(r.success ? { message: "Settings saved", ok: true } : { message: r.error, ok: false });
      if (r.success) router.refresh();
    });
  };

  const submitNewCategory = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData();
    fd.set("name", newCatName.trim());
    setCatFlash(null);
    startTransition(async () => {
      const r = await createCategory(fd);
      if (r.success) {
        setNewCatName("");
        setCatFlash({ message: "Categories updated", ok: true });
        router.refresh();
      } else {
        setCatFlash({ message: r.error, ok: false });
      }
    });
  };

  const saveRename = (categoryId: string) => {
    const fd = new FormData();
    fd.set("category_id", categoryId);
    fd.set("name", (renameValues[categoryId] ?? "").trim());
    setCatFlash(null);
    startTransition(async () => {
      const r = await updateCategory(fd);
      setCatFlash(r.success ? { message: "Categories updated", ok: true } : { message: r.error, ok: false });
      if (r.success) router.refresh();
    });
  };

  const doArchive = (categoryId: string) => {
    const fd = new FormData();
    fd.set("category_id", categoryId);
    setCatFlash(null);
    startTransition(async () => {
      const r = await archiveCategory(fd);
      setCatFlash(r.success ? { message: "Categories updated", ok: true } : { message: r.error, ok: false });
      if (r.success) router.refresh();
    });
  };

  const doUnarchive = (categoryId: string) => {
    const fd = new FormData();
    fd.set("category_id", categoryId);
    setCatFlash(null);
    startTransition(async () => {
      const r = await unarchiveCategory(fd);
      setCatFlash(r.success ? { message: "Categories updated", ok: true } : { message: r.error, ok: false });
      if (r.success) router.refresh();
    });
  };

  const doReorder = (categoryId: string, direction: "up" | "down") => {
    const fd = new FormData();
    fd.set("category_id", categoryId);
    fd.set("direction", direction);
    setCatFlash(null);
    startTransition(async () => {
      const r = await reorderCategory(fd);
      if (!r.success) {
        setCatFlash({ message: r.error, ok: false });
      } else {
        setCatFlash({ message: "Categories updated", ok: true });
        router.refresh();
      }
    });
  };

  return (
    <div className="mx-auto min-w-0 max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your organisation, practices and activity categories.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>
            Your account details for this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submitProfile}>
            <div className="grid gap-2">
              <label className="text-xs font-medium text-gray-600" htmlFor="full_name">
                Full name
              </label>
              <input
                id="full_name"
                name="full_name"
                required
                defaultValue={profile.full_name}
                className={inputCls}
              />
            </div>
            <div className="grid gap-2">
              <span className="text-xs font-medium text-gray-600">Email</span>
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
                {profile.email || "—"}
              </div>
            </div>
            <div className="grid gap-2">
              <span className="text-xs font-medium text-gray-600">Role</span>
              <div>
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                    roleBadgeClass(profile.role),
                  )}
                >
                  {formatRoleLabel(profile.role)}
                </span>
              </div>
            </div>
            <div className="grid gap-2">
              <span className="text-xs font-medium text-gray-600">
                Organisation
              </span>
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
                {organisationName}
              </div>
            </div>
            {profileFlash ? (
              <p
                className={`text-sm ${profileFlash.ok ? "text-emerald-700" : "text-red-600"}`}
                role="alert"
              >
                {profileFlash.message}
              </p>
            ) : null}
            <Button
              type="submit"
              disabled={pending}
              className="min-h-11 w-full bg-teal-600 text-white hover:bg-teal-700 sm:w-auto sm:min-h-0"
            >
              Save profile
            </Button>
          </form>
        </CardContent>
      </Card>

      {isOrgAdmin ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Organisation</CardTitle>
              <CardDescription>
                Name and defaults for your organisation. Slug is used in invite
                flows.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={submitOrg}>
                <div className="grid gap-2">
                  <label className="text-xs font-medium text-gray-600" htmlFor="org_name">
                    Organisation name
                  </label>
                  <input
                    id="org_name"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className={inputCls}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-xs font-medium text-gray-600">
                    Organisation slug (read-only)
                  </span>
                  <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 font-mono text-sm text-gray-700">
                    {organisationSlug || "—"}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <label className="text-xs font-medium text-gray-600" htmlFor="def_daily">
                      Default daily hours
                    </label>
                    <input
                      id="def_daily"
                      type="number"
                      min={0.25}
                      max={24}
                      step={0.25}
                      value={orgDailyHours}
                      onChange={(e) => setOrgDailyHours(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs font-medium text-gray-600" htmlFor="def_weekly">
                      Default weekly hours
                    </label>
                    <input
                      id="def_weekly"
                      type="number"
                      min={1}
                      max={80}
                      step={0.25}
                      value={orgWeeklyHours}
                      onChange={(e) => setOrgWeeklyHours(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Stored for your organisation (defaults 7.5 and 37.5). Daily value prefills
                  the activity log hours field.
                </p>
                {orgFlash ? (
                  <p
                    className={`text-sm ${orgFlash.ok ? "text-emerald-700" : "text-red-600"}`}
                    role="alert"
                  >
                    {orgFlash.message}
                  </p>
                ) : null}
                <Button
                  type="submit"
                  disabled={pending}
                  className="min-h-11 w-full bg-teal-600 text-white hover:bg-teal-700 sm:w-auto sm:min-h-0"
                >
                  Save organisation
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity categories</CardTitle>
              <CardDescription>
                Categories for appointment logging. Archived categories are hidden
                from the activity form but kept for history.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={submitNewCategory}>
                <div className="grid flex-1 gap-2">
                  <label className="text-xs font-medium text-gray-600" htmlFor="new_cat">
                    New category name
                  </label>
                  <input
                    id="new_cat"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className={inputCls}
                    placeholder="e.g. Face-to-face reviews"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={pending || !newCatName.trim()}
                  className="min-h-11 w-full shrink-0 bg-teal-600 text-white hover:bg-teal-700 sm:w-auto sm:min-h-0"
                >
                  Add category
                </Button>
              </form>

              {catFlash ? (
                <p
                  className={`text-sm ${catFlash.ok ? "text-emerald-700" : "text-red-600"}`}
                  role="alert"
                >
                  {catFlash.message}
                </p>
              ) : null}

              {initialCategories.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                  <SlidersHorizontal className="h-5 w-5 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    No categories set up yet. Add your first activity category below.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
                  {initialCategories.map((c, idx) => (
                    <li
                      key={c.id}
                      className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center"
                    >
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-11 w-11 md:h-8 md:w-8"
                          disabled={pending || idx === 0}
                          onClick={() => doReorder(c.id, "up")}
                          aria-label={`Move ${c.name} up`}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-11 w-11 md:h-8 md:w-8"
                          disabled={pending || idx >= initialCategories.length - 1}
                          onClick={() => doReorder(c.id, "down")}
                          aria-label={`Move ${c.name} down`}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            value={renameValues[c.id] ?? c.name}
                            onChange={(e) =>
                              setRenameValues((prev) => ({
                                ...prev,
                                [c.id]: e.target.value,
                              }))
                            }
                            className={inputCls}
                            aria-label={`Rename ${c.name}`}
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={
                              pending ||
                              (renameValues[c.id] ?? c.name).trim() === "" ||
                              (renameValues[c.id] ?? c.name).trim() === c.name
                            }
                            onClick={() => saveRename(c.id)}
                          >
                            Save name
                          </Button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {c.is_active ? (
                            <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200 ring-inset">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 ring-inset">
                              Archived
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            Sort order {c.sort_order}
                          </span>
                          {c.is_active ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-red-700"
                              disabled={pending}
                              onClick={() => doArchive(c.id)}
                            >
                              Archive
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={pending}
                              onClick={() => doUnarchive(c.id)}
                            >
                              Restore
                            </Button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
