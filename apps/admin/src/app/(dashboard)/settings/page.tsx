import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { AccountSettings } from "@/components/account-settings";

export const metadata: Metadata = {
  title: "الإعدادات — إدارة المنصة",
};

export default async function SettingsPage() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/login");
  }

  return (
    <div>
      <PageHeader title="الإعدادات" subtitle="إدارة حسابك الشخصي" />
      <AccountSettings profile={admin} />
    </div>
  );
}
