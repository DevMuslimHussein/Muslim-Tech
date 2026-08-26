"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { LectureRow } from "@/components/lecture-row";
import { Card, PageHeader, Button, Input, EmptyState, Skeleton } from "@/components/ui";
import { IconLayers, IconPlus, IconTrash, IconChevronLeft } from "@/components/icons";

interface Lecture {
  id: string;
  title: string;
  description: string | null;
  number: number;
  status: "draft" | "scheduled" | "published";
  thumbnailUrl: string | null;
  videoAssetId: string | null;
  youtubeId: string | null;
  files: { id: string; fileName: string; isDownloadable: boolean }[];
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

export function SubjectContentManager({ subjectId }: { subjectId: string }) {
  const [subject, setSubject] = useState<Subject | null>(null);
  const [chapters, setChapters] = useState<Chapter[] | null>(null);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [newLectureTitles, setNewLectureTitles] = useState<Record<string, string>>({});

  async function load() {
    const [subjectRes, chaptersRes] = await Promise.all([
      fetch(`/api/proxy/admin/subjects/${subjectId}`),
      fetch(`/api/proxy/subjects/${subjectId}/chapters?all=true`),
    ]);
    if (subjectRes.ok) setSubject((await subjectRes.json()) as Subject);
    if (chaptersRes.ok) setChapters((await chaptersRes.json()) as Chapter[]);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId]);

  async function addChapter(event: FormEvent) {
    event.preventDefault();
    if (!newChapterTitle.trim()) return;
    await fetch("/api/proxy/admin/chapters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId, title: newChapterTitle }),
    });
    setNewChapterTitle("");
    load();
  }

  async function removeChapter(chapter: Chapter) {
    if (!confirm(`حذف فصل "${chapter.title}"؟ سيُحذف كل محاضراته.`)) return;
    await fetch(`/api/proxy/admin/chapters/${chapter.id}`, { method: "DELETE" });
    load();
  }

  async function addLecture(chapter: Chapter, event: FormEvent) {
    event.preventDefault();
    const title = newLectureTitles[chapter.id]?.trim();
    if (!title) return;
    await fetch("/api/proxy/admin/lectures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapterId: chapter.id, title, number: chapter.lectures.length + 1 }),
    });
    setNewLectureTitles((prev) => ({ ...prev, [chapter.id]: "" }));
    load();
  }

  return (
    <div>
      <Link
        href="/subjects"
        className="mb-4 inline-flex items-center gap-1 text-sm text-ink-soft transition-colors hover:text-accent-ink"
      >
        <IconChevronLeft width={16} height={16} className="rotate-180" />
        المواد
      </Link>

      <PageHeader title={subject?.name ?? "…"} subtitle={subject?.description ?? undefined} />

      {chapters === null ? (
        <div className="space-y-4">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      ) : (
        <div className="space-y-5">
          {chapters.map((chapter) => (
            <Card key={chapter.id} className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-border bg-surface-2/60 px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <IconLayers width={17} height={17} className="text-accent" />
                  <span className="font-medium text-ink">{chapter.title}</span>
                  <span className="font-mono text-xs tabular-nums text-muted">
                    {chapter.lectures.length}
                  </span>
                </div>
                <button
                  onClick={() => removeChapter(chapter)}
                  aria-label="حذف الفصل"
                  className="rounded-md p-1.5 text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                >
                  <IconTrash width={15} height={15} />
                </button>
              </div>

              {chapter.lectures.map((lecture) => (
                <LectureRow key={lecture.id} lecture={lecture} onChanged={load} />
              ))}

              {chapter.lectures.length === 0 && (
                <p className="px-5 py-4 text-sm text-muted">لا توجد محاضرات في هذا الفصل</p>
              )}

              <form
                onSubmit={(event) => addLecture(chapter, event)}
                className="flex gap-2 border-t border-border px-5 py-3"
              >
                <Input
                  placeholder="عنوان محاضرة جديدة"
                  value={newLectureTitles[chapter.id] ?? ""}
                  onChange={(event) =>
                    setNewLectureTitles((prev) => ({ ...prev, [chapter.id]: event.target.value }))
                  }
                  className="py-1.5"
                />
                <Button type="submit" variant="secondary" className="shrink-0 px-3 py-1.5">
                  <IconPlus width={15} height={15} />
                  محاضرة
                </Button>
              </form>
            </Card>
          ))}

          {chapters.length === 0 && (
            <EmptyState
              icon={<IconLayers />}
              title="لا توجد فصول بعد"
              description="أضف أول فصل لهذه المادة، ثم أضف له محاضرات."
            />
          )}

          <Card className="p-4">
            <form onSubmit={addChapter} className="flex gap-2">
              <Input
                placeholder="عنوان فصل جديد"
                value={newChapterTitle}
                onChange={(event) => setNewChapterTitle(event.target.value)}
              />
              <Button type="submit" className="shrink-0">
                <IconPlus width={16} height={16} />
                إضافة فصل
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
