/** Human-readable role labels (safe for client or server — no Supabase imports). */

export function formatRoleLabel(role: string): string {
  switch (role) {
    case "pcn_manager":
      return "PCN Manager";
    case "practice_manager":
      return "Practice Manager";
    case "manager":
      return "Manager";
    case "admin":
      return "Admin";
    case "superadmin":
      return "Super Admin";
    case "clinician":
      return "Clinician";
    default:
      return role;
  }
}
