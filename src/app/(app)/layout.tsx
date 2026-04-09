import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopNavbar } from "@/components/layout/top-navbar";
import UserNav from "@/components/UserNav";
import { signOutAction } from "@/app/actions/auth";
import { getProfile } from "@/lib/supabase/auth";
import { getNavContext } from "@/lib/supabase/nav-context";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  const nav = await getNavContext();

  const practiceName = nav?.practiceName ?? "ReportRx";
  const userDisplayName = profile.full_name ?? "User";
  const userEmail = profile.email ?? "";
  const initials =
    profile.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "U";
  const roleLabels: Record<string, string> = {
    clinician: "Clinician",
    manager: "Manager",
    admin: "Admin",
    superadmin: "Super Admin",
  };
  const roleLabel = roleLabels[profile.role] ?? profile.role;

  return (
    <div className="flex min-h-screen flex-row bg-[#f8fafc] dark:bg-[#0f1117]">
      <AppSidebar
        userDisplayName={userDisplayName}
        userEmail={userEmail}
        initials={initials}
        roleLabel={roleLabel}
        canAccessAdmin={profile.role === "admin" || profile.role === "superadmin"}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNavbar
          practiceName={practiceName}
          userDisplayName={userDisplayName}
          userEmail={userEmail}
          initials={initials}
        />
        <div className="flex justify-end border-b border-slate-200 bg-white px-4 py-2 sm:px-6">
          <UserNav
            fullName={profile.full_name}
            email={profile.email}
            role={profile.role}
            orgName=""
            signOutAction={signOutAction}
          />
        </div>
        <main className="app-content-bg flex-1 overflow-auto p-4 sm:p-6 dark:bg-[#0f1117]">
          {children}
        </main>
      </div>
    </div>
  );
}
