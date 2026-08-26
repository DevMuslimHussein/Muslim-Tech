import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/session";
import { Sidebar } from "@/components/sidebar";
import { LogoutButton } from "@/components/logout-button";
import { Avatar } from "@/components/avatar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-bg/85 px-8 py-3.5 backdrop-blur">
          <Link href="/settings" className="flex items-center gap-2.5 rounded-md py-1 transition-opacity hover:opacity-80">
            <Avatar name={admin.fullName} src={admin.avatarUrl} size={32} />
            <div className="leading-tight">
              <p className="text-sm font-medium text-ink">{admin.fullName}</p>
              <p className="text-xs text-muted">مدير المنصة</p>
            </div>
          </Link>
          <LogoutButton />
        </header>
        <main className="mt-animate-in flex-1 px-8 py-7">{children}</main>
      </div>
    </div>
  );
}
