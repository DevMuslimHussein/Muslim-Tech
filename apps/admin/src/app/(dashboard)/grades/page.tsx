import type { Metadata } from "next";
import { GradebookView } from "./gradebook";

export const metadata: Metadata = {
  title: "سجل الدرجات — إدارة المنصة",
};

export default function GradesPage() {
  return <GradebookView />;
}
