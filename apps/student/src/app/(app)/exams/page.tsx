import type { Metadata } from "next";
import { ExamsList } from "./exams-list";

export const metadata: Metadata = {
  title: "الامتحانات — Muslim Tech",
};

export default function ExamsPage() {
  return <ExamsList />;
}
