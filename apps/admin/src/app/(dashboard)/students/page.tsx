import type { Metadata } from "next";
import { StudentsTable } from "./students-table";

export const metadata: Metadata = {
  title: "الطلاب — إدارة المنصة",
};

export default function StudentsPage() {
  return <StudentsTable />;
}
