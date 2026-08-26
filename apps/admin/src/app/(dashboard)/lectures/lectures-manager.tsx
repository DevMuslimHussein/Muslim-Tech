"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Card, PageHeader, Button, Input, Field, EmptyState, Skeleton } from "@/components/ui";
import { LectureRow, type ChapterOption } from "@/components/lecture-row";
import { IconPlay, IconPlus } from "@/components/icons";

interface Subject {
  id: string;
  name: string;
}

interface RawChapter {
  id: string;
  title: string;
}

interface LectureFile {
  id: string;
  fileName: string;
  isDownloadable: boolean;
}

interface Lecture {
  id: string;
  title: string;
  description: string | null;
  number: number;
  status: "draft" | "scheduled" | "published";
  thumbnailUrl: string | null;
  videoAssetId: string | null;
  files: LectureFile[];
  chapter: { id: string; title: string; subject: { id: string; name: string } };
}

export function LecturesManager() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapterOptions, setChapterOptions] = useState<ChapterOption[]>([]);
  const [lectures, setLectures] = useState<Lecture[] | null>(null);

  const [filterSubjectId, setFilterSubjectId] = useState("");

  const [formSubjectId, setFormSubjectId] = useState("");
  const [formChapterId, setFormChapterId] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function load() {
    const subjectsRes = await fetch("/api/proxy/admin/subjects");
    const subjectsList: Subject[] = subjectsRes.ok ? await subjectsRes.json() : [];
    setSubjects(subjectsList);

    const chapterLists = await Promise.all(
      subjectsList.map(async (subject) => {
        const res = await fetch(`/api/proxy/subjects/${subject.id}/chapters?all=true`);
        const chapters: RawChapter[] = res.ok ? await res.json() : [];
        return chapters.map((chapter) => ({
          id: chapter.id,
          title: chapter.title,
          subjectName: subject.name,
        }));
      }),
    );
    setChapterOptions(chapterLists.flat());

    const lecturesRes = await fetch("/api/proxy/admin/lectures");
    setLectures(lecturesRes.ok ? ((await lecturesRes.json()) as Lecture[]) : []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount
    load();
  }, []);

  const formChapters = useMemo(
    () => chapterOptions.filter((c) => subjects.find((s) => s.name === c.subjectName)?.id === formSubjectId),
    [chapterOptions, subjects, formSubjectId],
  );

  const visibleLectures = useMemo(
    () =>
      filterSubjectId
        ? (lectures ?? []).filter((l) => l.chapter.subject.id === filterSubjectId)
        : (lectures ?? []),
    [lectures, filterSubjectId],
  );

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!formChapterId) {
      setFormError("اختر المادة والفصل أولًا");
      return;
    }

    setIsSubmitting(true);
    const existingCount = (lectures ?? []).filter((l) => l.chapter.id === formChapterId).length;
    const response = await fetch("/api/proxy/admin/lectures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapterId: formChapterId, title: formTitle, number: existingCount + 1 }),
    });
    setIsSubmitting(false);

    if (!response.ok) {
      setFormError("تعذّر إنشاء المحاضرة");
      return;
    }

    setFormTitle("");
    load();
  }

  return (
    <div>
      <PageHeader
        title="المحاضرات"
        subtitle={lectures ? `${lectures.length} محاضرة في كل المواد` : undefined}
        action={
          subjects.length > 0 ? (
            <select
              value={filterSubjectId}
              onChange={(e) => setFilterSubjectId(e.target.value)}
              className="rounded-md border border-border bg-surface px-3.5 py-2 text-sm text-ink outline-none focus:border-accent"
            >
              <option value="">كل المواد</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          ) : undefined
        }
      />

      <Card className="mb-6 p-5">
        <p className="mb-4 text-sm font-medium text-ink">إضافة محاضرة جديدة</p>
        <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-[1fr_1fr_1.4fr_auto] sm:items-end">
          <Field label="المادة">
            <select
              value={formSubjectId}
              onChange={(e) => {
                setFormSubjectId(e.target.value);
                setFormChapterId("");
              }}
              className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent"
            >
              <option value="">— اختر —</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="الفصل">
            <select
              value={formChapterId}
              onChange={(e) => setFormChapterId(e.target.value)}
              disabled={!formSubjectId}
              className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent disabled:opacity-50"
            >
              <option value="">— اختر —</option>
              {formChapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.title}
                </option>
              ))}
            </select>
          </Field>

          <Field label="عنوان المحاضرة">
            <Input required value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
          </Field>

          <Button type="submit" disabled={isSubmitting}>
            <IconPlus width={16} height={16} />
            إضافة
          </Button>
        </form>
        {formError && <p className="mt-3 text-sm text-danger">{formError}</p>}
        {subjects.length === 0 && (
          <p className="mt-3 text-xs text-muted">أضف مادة وفصلًا أولًا من صفحة «المواد» قبل إنشاء محاضرة.</p>
        )}
      </Card>

      {lectures === null ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : visibleLectures.length > 0 ? (
        <Card className="overflow-hidden">
          {visibleLectures.map((lecture) => (
            <div key={lecture.id}>
              <div className="border-b border-border bg-surface-2/40 px-5 py-1.5 text-xs text-muted">
                {lecture.chapter.subject.name} — {lecture.chapter.title}
              </div>
              <LectureRow
                lecture={lecture}
                onChanged={load}
                chapterId={lecture.chapter.id}
                chapterOptions={chapterOptions}
              />
            </div>
          ))}
        </Card>
      ) : (
        <EmptyState
          icon={<IconPlay />}
          title="لا توجد محاضرات"
          description="أضف محاضرة من النموذج أعلاه بعد اختيار المادة والفصل."
        />
      )}
    </div>
  );
}
