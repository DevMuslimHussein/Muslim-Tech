import Link from "next/link";
import { notFound } from "next/navigation";
import { serverApiFetch } from "@/lib/server-api";
import { Card, PageHeader, EmptyState, ProgressBar } from "@/components/ui";
import { IconPlay, IconLayers, IconChevronLeft } from "@/components/icons";

interface Lecture {
  id: string;
  title: string;
  number: number;
}

interface Chapter {
  id: string;
  title: string;
  lectures: Lecture[];
}

interface Subject {
  id: string;
  name: string;
  description: string | null;
}

export default async function SubjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [subject, chapters, progressMap] = await Promise.all([
    serverApiFetch<Subject>(`/subjects/${id}`),
    serverApiFetch<Chapter[]>(`/subjects/${id}/chapters`),
    serverApiFetch<Record<string, { percent: number; completed: number; total: number }>>(
      "/progress/subjects",
    ),
  ]);

  if (!subject) {
    notFound();
  }

  const progress = progressMap?.[id];

  return (
    <div>
      <Link
        href="/subjects"
        className="mb-4 inline-flex items-center gap-1 text-sm text-ink-soft transition-colors hover:text-accent-ink"
      >
        <IconChevronLeft width={16} height={16} className="rotate-180" />
        المواد
      </Link>

      <PageHeader title={subject.name} subtitle={subject.description ?? undefined} />

      {progress && progress.total > 0 && (
        <Card className="mb-6 p-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-ink-soft">
              أكملت {progress.completed} من {progress.total} محاضرة
            </span>
            <span className="font-mono text-sm font-medium tabular-nums text-ink">
              {progress.percent}%
            </span>
          </div>
          <ProgressBar percent={progress.percent} />
        </Card>
      )}

      <div className="space-y-5">
        {(chapters ?? []).map((chapter) => (
          <Card key={chapter.id} className="overflow-hidden">
            <div className="flex items-center gap-2.5 border-b border-border bg-surface-2/60 px-5 py-3.5">
              <IconLayers width={17} height={17} className="text-accent" />
              <span className="font-medium text-ink">{chapter.title}</span>
              <span className="font-mono text-xs tabular-nums text-muted">
                {chapter.lectures.length}
              </span>
            </div>

            {chapter.lectures.map((lecture) => (
              <Link
                key={lecture.id}
                href={`/lectures/${lecture.id}`}
                className="flex items-center gap-3 border-b border-border px-5 py-3 text-sm transition-colors last:border-0 hover:bg-surface-2"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-2 text-muted">
                  <IconPlay width={15} height={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-mono text-xs tabular-nums text-muted">{lecture.number}.</span>{" "}
                  <span className="text-ink">{lecture.title}</span>
                </span>
              </Link>
            ))}

            {chapter.lectures.length === 0 && (
              <p className="px-5 py-4 text-sm text-muted">لا توجد محاضرات في هذا الفصل بعد</p>
            )}
          </Card>
        ))}

        {(!chapters || chapters.length === 0) && (
          <EmptyState icon={<IconLayers />} title="لا توجد فصول في هذه المادة بعد" />
        )}
      </div>
    </div>
  );
}
