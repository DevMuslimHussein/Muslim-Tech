import type { Metadata } from "next";
import { AnnouncementsManager } from "./announcements-manager";

export const metadata: Metadata = {
  title: "الإعلانات — إدارة المنصة",
};

export default function AnnouncementsPage() {
  return <AnnouncementsManager />;
}
