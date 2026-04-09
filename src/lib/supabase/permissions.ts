import { createClient } from "./server";

type RoleGraphRole = {
  id: string;
  name: string;
  category: string;
  role_permissions: { permissions: { key: string } | null }[] | null;
};

type RoleGraphRow = {
  roles: RoleGraphRole | RoleGraphRole[] | null;
};

const ADMIN_ROLE_NAMES = new Set(["admin", "administrator"]);
const ADMIN_PERMISSION_KEYS = new Set(["admin", "system.admin"]);

/**
 * One round-trip: user_roles → roles → role_permissions → permissions.
 */
async function fetchUserRoleGraph(userId: string): Promise<{
  roles: { id: string; name: string; category: string }[];
  permissionKeys: string[];
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_roles")
    .select(
      `
      roles (
        id,
        name,
        category,
        role_permissions (
          permissions (
            key
          )
        )
      )
    `,
    )
    .eq("profile_id", userId);

  if (error) {
    console.error("[fetchUserRoleGraph]", error.message);
    return { roles: [], permissionKeys: [] };
  }

  const roleMap = new Map<
    string,
    { id: string; name: string; category: string }
  >();
  const keys = new Set<string>();

  for (const row of (data ?? []) as unknown as RoleGraphRow[]) {
    const roleEntries = Array.isArray(row.roles) ? row.roles : row.roles ? [row.roles] : [];
    for (const r of roleEntries) {
      roleMap.set(r.id, { id: r.id, name: r.name, category: r.category });
      for (const rp of r.role_permissions ?? []) {
        const k = rp.permissions?.key;
        if (k) keys.add(k);
      }
    }
  }

  return {
    roles: [...roleMap.values()],
    permissionKeys: [...keys],
  };
}

/** All permission keys granted to the user via RBAC roles (`profiles.id` / auth user id). */
export async function getUserPermissions(userId: string): Promise<string[]> {
  const { permissionKeys } = await fetchUserRoleGraph(userId);
  return permissionKeys;
}

export async function userHasPermission(
  userId: string,
  permissionKey: string,
): Promise<boolean> {
  const { permissionKeys } = await fetchUserRoleGraph(userId);
  return permissionKeys.includes(permissionKey);
}

/**
 * Admin if role name/category indicates admin, or a known admin permission key is present.
 * Align `roles.name`, `roles.category`, and `permissions.key` in the database with these checks.
 */
export async function userIsAdmin(userId: string): Promise<boolean> {
  const { roles, permissionKeys } = await fetchUserRoleGraph(userId);
  if (
    roles.some((r) =>
      ADMIN_ROLE_NAMES.has((r.name ?? "").trim().toLowerCase()),
    )
  ) {
    return true;
  }
  if (
    roles.some((r) => (r.category ?? "").trim().toLowerCase() === "admin")
  ) {
    return true;
  }
  if (permissionKeys.some((k) => ADMIN_PERMISSION_KEYS.has(k))) {
    return true;
  }
  return false;
}

export async function getUserRoles(
  userId: string,
): Promise<{ id: string; name: string; category: string }[]> {
  const { roles } = await fetchUserRoleGraph(userId);
  return roles;
}
