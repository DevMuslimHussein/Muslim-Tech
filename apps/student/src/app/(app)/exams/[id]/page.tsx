import type { Metadata } from "next";
import { ExamRunner } from "./exam-runner";

export const metadata: Metadata = {
  title: "امتحان — Muslim Tech",
};

export default async function ExamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ExamRunner examId={id} />;
}
