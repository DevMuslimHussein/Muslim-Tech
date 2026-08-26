import type { Metadata } from "next";
import { ExamsManager } from "./exams-manager";

export const metadata: Metadata = {
  title: "الامتحانات — إدارة المنصة",
};

export default function ExamsPage() {
  return <ExamsManager />;
}
