import type { Metadata } from "next";
import { LecturesManager } from "./lectures-manager";

export const metadata: Metadata = {
  title: "المحاضرات — إدارة المنصة",
};

export default function LecturesPage() {
  return <LecturesManager />;
}
