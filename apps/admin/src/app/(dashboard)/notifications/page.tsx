import type { Metadata } from "next";
import { NotificationsComposer } from "./notifications-composer";

export const metadata: Metadata = {
  title: "التنبيهات — إدارة المنصة",
};

export default function AdminNotificationsPage() {
  return <NotificationsComposer />;
}
