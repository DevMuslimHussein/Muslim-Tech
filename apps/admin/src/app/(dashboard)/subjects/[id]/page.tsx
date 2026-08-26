import { SubjectContentManager } from "./subject-content-manager";

export default async function SubjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SubjectContentManager subjectId={id} />;
}
