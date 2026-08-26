import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentStudent } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { AccountSettings } from "@/components/account-settings";

export const metadata: Metadata = {
  title: "حسابي — Muslim Tech",
};

export default async function SettingsPage() {
  const student = await getCurrentStudent();

  if (!student) {
    redirect("/login");
  }

  return (
    <div>
      <PageHeader title="حسابي" subtitle="إدارة معلوماتك الشخصية وكلمة المرور" />
      <AccountSettings profile={student} />
    </div>
  );
}
