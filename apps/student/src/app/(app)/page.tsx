import Link from "next/link";
import { serverApiFetch } from "@/lib/server-api";
import { Card, Badge, EmptyState, ProgressBar } from "@/components/ui";
import { IconPlay, IconBook, IconMegaphone } from "@/components/icons";

interface Lecture {
  id: string;
  title: string;
  number: number;
  chapter: { title: string; subject: { id: string; name: string } };
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  linkUrl: string | null;
}

interface Subject {
  id: string;
  name: string;
  lectureCount: number;
  progress: { total: number; completed: number; percent: number };
}

interface ContinueRow {
  lectureId: string;
  progressSeconds: number;
  durationSeconds: number;
  lecture: { id: string; title: string; chapter: { subject: { name: string } } };
}

interface HomeSummary {
  latestLectures: Lecture[];
  announcements: Announcement[];
  subjects: Subject[];
  continueWatching: ContinueRow[];
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default async function HomePage() {
  const summary = await serverApiFetch<HomeSummary>("/home");

  if (!summary) {
    return <EmptyState title="تعذّر تحميل المحتوى" description="حاول تحديث الصفحة." />;
  }

  const overallPercent =
    summary.subjects.length > 0
      ? Math.round(
          summary.subjects.reduce((sum, s) => sum + s.progress.percent, 0) / summary.subjects.length,
        )
      : 0;

  return (
    <div className="space-y-9">
      <section className="overflow-hidden rounded-xl bg-gradient-brand p-7 text-white shadow-accent">
        <p className="text-sm/relaxed opacity-90">تقدّمك الإجمالي</p>
        <p className="mt-1 font-mono text-4xl font-semibold tabular-nums">{overallPercent}%</p>
        <div className="mt-4 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-white/25">
          <div
            className="h-full rounded-full bg-white transition-[width] duration-700 ease-mt"
            style={{ width: `${overallPercent}%` }}
          />
        </div>
        <p className="mt-3 text-sm opacity-90">
          {summary.subjects.reduce((sum, s) => sum + s.progress.completed, 0)} محاضرة مكتملة من{" "}
          {summary.subjects.reduce((sum, s) => sum + s.progress.total, 0)}
        </p>
      </section>

      {summary.continueWatching.length > 0 && (
        <section>
          <h2 className="mb-4 text-base font-semibold text-ink">أكمل من حيث توقفت</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summary.continueWatching.map((row) => {
              const percent = row.durationSeconds
                ? Math.round((row.progressSeconds / row.durationSeconds) * 100)
                : 0;
              return (
                <Link key={row.lectureId} href={`/lectures/${row.lecture.id}`}>
                  <Card hover className="h-full p-4">
                    <span className="mb-3 flex size-9 items-center justify-center rounded-md bg-accent-soft text-accent">
                      <IconPlay width={17} height={17} />
                    </span>
                    <p className="text-xs text-muted">{row.lecture.chapter.subject.name}</p>
                    <p className="mt-1 line-clamp-2 text-sm font-medium text-ink">{row.lecture.title}</p>
                    <div className="mt-3">
                      <ProgressBar percent={percent} />
                      <p className="mt-1.5 font-mono text-[11px] tabular-nums text-muted">
                        {formatTime(row.progressSeconds)} / {formatTime(row.durationSeconds)}
                      </p>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {summary.announcements.length > 0 && (
        <section>
          <h2 className="mb-4 text-base font-semibold text-ink">الإعلانات</h2>
          <div className="space-y-3">
            {summary.announcements.slice(0, 3).map((announcement) => (
              <Card key={announcement.id} className="border-r-2 border-r-warning p-4">
                <div className="flex items-start gap-3">
                  <IconMegaphone width={18} height={18} className="mt-0.5 shrink-0 text-warning" />
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{announcement.title}</p>
                    <p className="mt-1 text-sm text-ink-soft">{announcement.body}</p>
                    {announcement.linkUrl && (
                      <a
                        href={announcement.linkUrl}
                        className="mt-2 inline-block text-sm text-accent-ink hover:underline"
                      >
                        التفاصيل
                      </a>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-base font-semibold text-ink">أحدث المحاضرات</h2>
        {summary.latestLectures.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {summary.latestLectures.map((lecture) => (
              <Link key={lecture.id} href={`/lectures/${lecture.id}`}>
                <Card hover className="h-full p-4">
                  <Badge tone="accent">{lecture.chapter.subject.name}</Badge>
                  <p className="mt-2.5 font-medium text-ink">{lecture.title}</p>
                  <p className="mt-1 text-xs text-muted">{lecture.chapter.title}</p>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState icon={<IconPlay />} title="لا توجد محاضرات منشورة بعد" />
        )}
      </section>

      <section>
        <h2 className="mb-4 text-base font-semibold text-ink">موادّك</h2>
        {summary.subjects.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {summary.subjects.map((subject) => (
              <Link key={subject.id} href={`/subjects/${subject.id}`}>
                <Card hover className="h-full p-5">
                  <span className="mb-3 flex size-10 items-center justify-center rounded-md bg-violet-soft text-violet">
                    <IconBook width={19} height={19} />
                  </span>
                  <p className="font-medium text-ink">{subject.name}</p>
                  <p className="mt-1 text-xs text-muted">{subject.lectureCount} محاضرة</p>
                  <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-xs text-ink-soft">التقدّم</span>
                      <span className="font-mono text-xs tabular-nums text-ink-soft">
                        {subject.progress.percent}%
                      </span>
                    </div>
                    <ProgressBar percent={subject.progress.percent} tone="violet" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState icon={<IconBook />} title="لا توجد مواد بعد" />
        )}
      </section>
    </div>
  );
}
