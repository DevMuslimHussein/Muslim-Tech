import type { Metadata } from "next";
import Link from "next/link";
import { serverApiFetch } from "@/lib/server-api";
import { Card, PageHeader, EmptyState, ProgressBar } from "@/components/ui";
import { IconBook } from "@/components/icons";

export const metadata: Metadata = {
  title: "المواد — Muslim Tech",
};

interface Subject {
  id: string;
  name: string;
  description: string | null;
  lectureCount: number;
}

type ProgressMap = Record<string, { total: number; completed: number; percent: number }>;

export default async function SubjectsPage() {
  const [subjects, progress] = await Promise.all([
    serverApiFetch<Subject[]>("/subjects"),
    serverApiFetch<ProgressMap>("/progress/subjects"),
  ]);

  const list = subjects ?? [];

  return (
    <div>
      <PageHeader title="المواد" subtitle={`${list.length} مادة متاحة`} />

      {list.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((subject) => {
            const percent = progress?.[subject.id]?.percent ?? 0;
            return (
              <Link key={subject.id} href={`/subjects/${subject.id}`}>
                <Card hover className="h-full p-5">
                  <span className="mb-3 flex size-10 items-center justify-center rounded-md bg-accent-soft text-accent">
                    <IconBook width={19} height={19} />
                  </span>
                  <p className="font-medium text-ink">{subject.name}</p>
                  {subject.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{subject.description}</p>
                  )}
                  <p className="mt-2 text-xs text-muted">{subject.lectureCount} محاضرة</p>
                  <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-xs text-ink-soft">التقدّم</span>
                      <span className="font-mono text-xs tabular-nums text-ink-soft">{percent}%</span>
                    </div>
                    <ProgressBar percent={percent} />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<IconBook />}
          title="لا توجد مواد حاليًا"
          description="ستظهر المواد هنا فور نشرها من إدارة المنصة."
        />
      )}
    </div>
  );
}
