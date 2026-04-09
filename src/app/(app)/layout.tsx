import AppSidebar from "@/components/layout/app-sidebar";
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

  return (
    <div className="flex min-h-screen bg-[#F7F8FA]">
      <AppSidebar
        canAccessAdmin={profile.role === "admin" || profile.role === "superadmin"}
        profile={{
          full_name: profile.full_name ?? "User",
          email: profile.email ?? "",
          role: profile.role,
        }}
        signOutAction={signOutAction}
      />
      <main className="min-w-0 flex-1 overflow-auto">
        <TopNavbar
          practiceName={practiceName}
          userDisplayName={userDisplayName}
          userEmail={userEmail}
          initials={initials}
        />
        <div className="flex justify-end border-b border-gray-200 bg-white px-4 py-2 sm:px-6">
          <UserNav
            fullName={profile.full_name}
            email={profile.email}
            role={profile.role}
            orgName=""
            signOutAction={signOutAction}
          />
        </div>
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
