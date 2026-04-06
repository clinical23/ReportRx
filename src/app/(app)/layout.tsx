import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopNavbar } from "@/components/layout/top-navbar";
import { getNavContext } from "@/lib/supabase/nav-context";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nav = await getNavContext();

  const userLine = nav?.sidebarLine ?? "Signed in";
  const practiceName = nav?.practiceName ?? "ReportRx";
  const userDisplayName = nav?.userDisplayName ?? "User";
  const userEmail = nav?.userEmail ?? "";
  const initials = nav?.initials ?? "U";

  return (
    <div className="flex min-h-screen bg-muted/30">
      <AppSidebar userLine={userLine} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNavbar
          practiceName={practiceName}
          userDisplayName={userDisplayName}
          userEmail={userEmail}
          initials={initials}
        />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
