"use server";

import { revalidatePath } from "next/cache";

import { getProfile, requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export type SettingsActionResult =
  | { success: true }
  | { success: false; error: string };

export async function updateProfile(
  formData: FormData,
): Promise<SettingsActionResult> {
  const profile = await getProfile();
  const full_name = String(formData.get("full_name") ?? "").trim();
  if (!full_name) {
    return { success: false, error: "Name is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name })
    .eq("id", profile.id);

  if (error) {
    console.error("[updateProfile]", error.message);
    return { success: false, error: "Could not update profile." };
  }

  revalidatePath("/settings");
  revalidatePath("/");
  revalidatePath("/activity");
  return { success: true };
}

export async function updateOrganisation(
  formData: FormData,
): Promise<SettingsActionResult> {
  const profile = await requireRole("admin", "superadmin");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { success: false, error: "Organisation name is required." };
  }

  const hoursRaw = String(formData.get("default_hours_per_day") ?? "").trim();
  const parsedHours = hoursRaw === "" ? 7.5 : parseFloat(hoursRaw);
  if (!Number.isFinite(parsedHours) || parsedHours <= 0 || parsedHours > 24) {
    return {
      success: false,
      error: "Default hours must be between 0 and 24.",
    };
  }

  const supabase = await createClient();
  const { data: orgRow, error: fetchErr } = await supabase
    .from("organisations")
    .select("settings")
    .eq("id", profile.organisation_id)
    .maybeSingle();

  if (fetchErr) {
    console.error("[updateOrganisation] fetch", fetchErr.message);
    return { success: false, error: "Could not load organisation." };
  }

  const prevSettings =
    orgRow &&
    typeof (orgRow as { settings?: unknown }).settings === "object" &&
    (orgRow as { settings?: unknown }).settings !== null
      ? { ...((orgRow as { settings: Record<string, unknown> }).settings) }
      : {};

  const settings = {
    ...prevSettings,
    default_hours_per_day: Math.round(parsedHours * 1000) / 1000,
  };

  const { error } = await supabase
    .from("organisations")
    .update({ name, settings })
    .eq("id", profile.organisation_id);

  if (error) {
    console.error("[updateOrganisation]", error.message);
    return { success: false, error: "Could not update organisation." };
  }

  revalidatePath("/settings");
  revalidatePath("/activity");
  return { success: true };
}

export async function createCategory(
  formData: FormData,
): Promise<SettingsActionResult> {
  const profile = await requireRole("admin", "superadmin");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { success: false, error: "Category name is required." };
  }

  const supabase = await createClient();
  const { data: maxRow } = await supabase
    .from("activity_categories")
    .select("sort_order")
    .eq("organisation_id", profile.organisation_id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder =
    typeof (maxRow as { sort_order?: number } | null)?.sort_order === "number"
      ? Number((maxRow as { sort_order: number }).sort_order) + 1
      : 0;

  const { error } = await supabase.from("activity_categories").insert({
    name,
    organisation_id: profile.organisation_id,
    sort_order: nextOrder,
    is_active: true,
  });

  if (error) {
    console.error("[createCategory]", error.message);
    if (error.code === "23505") {
      return { success: false, error: "A category with that name already exists." };
    }
    return { success: false, error: "Could not create category." };
  }

  revalidatePath("/settings");
  revalidatePath("/activity");
  revalidatePath("/reporting");
  return { success: true };
}

export async function updateCategory(
  formData: FormData,
): Promise<SettingsActionResult> {
  const profile = await requireRole("admin", "superadmin");
  const categoryId = String(formData.get("category_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!categoryId || !name) {
    return { success: false, error: "Category and name are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("activity_categories")
    .update({ name })
    .eq("id", categoryId)
    .eq("organisation_id", profile.organisation_id);

  if (error) {
    console.error("[updateCategory]", error.message);
    if (error.code === "23505") {
      return { success: false, error: "A category with that name already exists." };
    }
    return { success: false, error: "Could not update category." };
  }

  revalidatePath("/settings");
  revalidatePath("/activity");
  revalidatePath("/reporting");
  return { success: true };
}

export async function archiveCategory(
  formData: FormData,
): Promise<SettingsActionResult> {
  const profile = await requireRole("admin", "superadmin");
  const categoryId = String(formData.get("category_id") ?? "").trim();
  if (!categoryId) {
    return { success: false, error: "Missing category." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("activity_categories")
    .update({ is_active: false })
    .eq("id", categoryId)
    .eq("organisation_id", profile.organisation_id);

  if (error) {
    console.error("[archiveCategory]", error.message);
    return { success: false, error: "Could not archive category." };
  }

  revalidatePath("/settings");
  revalidatePath("/activity");
  revalidatePath("/reporting");
  return { success: true };
}

export async function reorderCategory(
  formData: FormData,
): Promise<SettingsActionResult> {
  const profile = await requireRole("admin", "superadmin");
  const categoryId = String(formData.get("category_id") ?? "").trim();
  const direction = String(formData.get("direction") ?? "").trim();
  if (!categoryId || (direction !== "up" && direction !== "down")) {
    return { success: false, error: "Invalid reorder request." };
  }

  const supabase = await createClient();
  const { data: rows, error: listErr } = await supabase
    .from("activity_categories")
    .select("id, sort_order")
    .eq("organisation_id", profile.organisation_id)
    .order("sort_order", { ascending: true });

  if (listErr || !rows?.length) {
    console.error("[reorderCategory] list", listErr?.message);
    return { success: false, error: "Could not load categories." };
  }

  const list = rows as { id: string; sort_order: number }[];
  const i = list.findIndex((r) => r.id === categoryId);
  if (i < 0) {
    return { success: false, error: "Category not found." };
  }

  const j = direction === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= list.length) {
    return { success: true };
  }

  const a = list[i];
  const b = list[j];
  const aSo = a.sort_order;
  const bSo = b.sort_order;

  const { error: e1 } = await supabase
    .from("activity_categories")
    .update({ sort_order: bSo })
    .eq("id", a.id)
    .eq("organisation_id", profile.organisation_id);

  if (e1) {
    console.error("[reorderCategory] a", e1.message);
    return { success: false, error: "Could not reorder." };
  }

  const { error: e2 } = await supabase
    .from("activity_categories")
    .update({ sort_order: aSo })
    .eq("id", b.id)
    .eq("organisation_id", profile.organisation_id);

  if (e2) {
    console.error("[reorderCategory] b", e2.message);
    return { success: false, error: "Could not reorder." };
  }

  revalidatePath("/settings");
  revalidatePath("/activity");
  revalidatePath("/reporting");
  return { success: true };
}
