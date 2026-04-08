import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopNavbar } from "@/components/layout/top-navbar";
import { getNavContext } from "@/lib/supabase/nav-context";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nav = await getNavContext();

  const practiceName = nav?.practiceName ?? "ReportRx";
  const userDisplayName = nav?.userDisplayName ?? "User";
  const userEmail = nav?.userEmail ?? "";
  const initials = nav?.initials ?? "U";
  const roleLabel = nav?.roleLabel ?? "User";

  return (
    <div className="flex min-h-screen flex-row bg-[#f8fafc]">
      <AppSidebar
        userDisplayName={userDisplayName}
        userEmail={userEmail}
        initials={initials}
        roleLabel={roleLabel}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNavbar
          practiceName={practiceName}
          userDisplayName={userDisplayName}
          userEmail={userEmail}
          initials={initials}
        />
        <main className="app-content-bg flex-1 overflow-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
