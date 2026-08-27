import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentStudent } from "@/lib/session";
import { Sidebar, MobileNav } from "@/components/sidebar";
import { LogoutButton } from "@/components/logout-button";
import { NotificationBell } from "@/components/notification-bell";
import { Avatar } from "@/components/avatar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const student = await getCurrentStudent();

  if (!student) {
    redirect("/login");
  }

  return (
    // The mesh is fixed rather than part of the scrolling flow, so the tint
    // stays put while long pages scroll over it.
    <div className="relative flex min-h-screen">
      <div aria-hidden className="pointer-events-none fixed inset-0 bg-mesh" />

      <div className="relative flex min-h-screen w-full">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Blur without a fill: content scrolling underneath is softened
              while the page's gradient still shows through the bar. */}
          <header className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-3.5 backdrop-blur-md">
            <Link
              href="/settings"
              className="flex items-center gap-2.5 rounded-xl py-1 transition-opacity hover:opacity-80"
            >
              <Avatar name={student.fullName} src={student.avatarUrl} size={34} />
              <div className="leading-tight">
                <p className="text-sm font-medium text-ink">{student.fullName}</p>
                <p className="font-en text-xs text-muted">@{student.username}</p>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <LogoutButton />
            </div>
          </header>
          {/* Extra bottom padding on phones clears the fixed nav bar. */}
          <main className="mt-animate-in flex-1 px-4 pb-24 sm:px-6 md:pb-8">{children}</main>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
