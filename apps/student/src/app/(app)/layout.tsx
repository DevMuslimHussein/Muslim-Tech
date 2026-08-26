import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentStudent } from "@/lib/session";
import { Sidebar } from "@/components/sidebar";
import { LogoutButton } from "@/components/logout-button";
import { NotificationBell } from "@/components/notification-bell";
import { Avatar } from "@/components/avatar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const student = await getCurrentStudent();

  if (!student) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-bg/85 px-8 py-3 backdrop-blur">
          <Link
            href="/settings"
            className="flex items-center gap-2.5 rounded-md py-1 transition-opacity hover:opacity-80"
          >
            <Avatar name={student.fullName} src={student.avatarUrl} size={32} />
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
        <main className="mt-animate-in flex-1 px-8 py-7">{children}</main>
      </div>
    </div>
  );
}
