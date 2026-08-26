"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, PageHeader, Badge, EmptyState, Skeleton, Button, Input } from "@/components/ui";
import { IconExam, IconPlus, IconTrash, IconCheck, IconUsers } from "@/components/icons";
import { QuestionEditor } from "./question-editor";
import { AttemptsPanel } from "./attempts-panel";

interface Subject {
  id: string;
  name: string;
}

export interface Exam {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number | null;
  passMark: number;
  maxAttempts: number;
  shuffleQuestions: boolean;
  showResultsImmediately: boolean;
  status: "draft" | "published";
  subject: { id: string; name: string };
  chapter: { id: string; title: string } | null;
  _count: { questions: number; attempts: number };
}

export function ExamsManager() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exams, setExams] = useState<Exam[] | null>(null);
  const [filter, setFilter] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [openExamId, setOpenExamId] = useState<string | null>(null);
  const [attemptsExamId, setAttemptsExamId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const query = filter ? `?subjectId=${filter}` : "";
    const response = await fetch(`/api/proxy/admin/exams${query}`).catch(() => null);
    setExams(response?.ok ? ((await response.json()) as Exam[]) : []);
  }, [filter]);

  useEffect(() => {
    void fetch("/api/proxy/admin/subjects")
      .then((r) => (r.ok ? r.json() : []))
      .then((s: Subject[]) => setSubjects(s))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function publish(exam: Exam) {
    const endpoint = exam.status === "published" ? "unpublish" : "publish";
    const response = await fetch(`/api/proxy/admin/exams/${exam.id}/${endpoint}`, {
      method: "POST",
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      alert(body?.message ?? "تعذّر تغيير الحالة");
      return;
    }
    void load();
  }

  async function remove(exam: Exam) {
    if (!confirm(`حذف امتحان "${exam.title}"؟ ستُحذف كل المحاولات والدرجات المرتبطة به.`)) return;
    await fetch(`/api/proxy/admin/exams/${exam.id}`, { method: "DELETE" });
    void load();
  }

  return (
    <div>
      <PageHeader
        title="الامتحانات"
        subtitle={exams ? `${exams.length} امتحان` : undefined}
        action={
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
            >
              <option value="">كل المواد</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <Button onClick={() => setIsCreating((v) => !v)}>
              <IconPlus width={15} height={15} />
              امتحان جديد
            </Button>
          </div>
        }
      />

      {isCreating && (
        <CreateExamForm
          subjects={subjects}
          onDone={() => {
            setIsCreating(false);
            void load();
          }}
          onCancel={() => setIsCreating(false)}
        />
      )}

      {exams === null ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : exams.length === 0 ? (
        <EmptyState
          icon={<IconExam />}
          title="لا توجد امتحانات"
          description="أنشئ امتحانًا وأضف أسئلته، ثم انشره ليظهر للطلاب."
        />
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => (
            <Card key={exam.id} className="overflow-hidden">
              <div className="flex flex-wrap items-center gap-3 px-5 py-4">
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-md ${
                    exam.status === "published"
                      ? "bg-success-soft text-success"
                      : "bg-surface-2 text-muted"
                  }`}
                >
                  <IconExam width={17} height={17} />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{exam.title}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {exam.subject.name}
                    {exam.chapter ? ` · ${exam.chapter.title}` : ""} ·{" "}
                    {exam._count.questions} سؤال · {exam._count.attempts} محاولة
                    {exam.durationMinutes ? ` · ${exam.durationMinutes} دقيقة` : ""}
                  </p>
                </div>

                <Badge tone={exam.status === "published" ? "success" : "neutral"}>
                  {exam.status === "published" ? "منشور" : "مسودة"}
                </Badge>

                <button
                  onClick={() =>
                    setOpenExamId((id) => (id === exam.id ? null : exam.id))
                  }
                  className="rounded-md border border-border px-2.5 py-1.5 text-xs text-ink-soft transition-colors hover:border-accent hover:text-accent-ink"
                >
                  الأسئلة
                </button>

                <button
                  onClick={() =>
                    setAttemptsExamId((id) => (id === exam.id ? null : exam.id))
                  }
                  className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs text-ink-soft transition-colors hover:border-accent hover:text-accent-ink"
                >
                  <IconUsers width={13} height={13} />
                  النتائج
                </button>

                <button
                  onClick={() => publish(exam)}
                  className={`flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                    exam.status === "published"
                      ? "border-border text-ink-soft hover:border-warning hover:text-warning"
                      : "border-border text-ink-soft hover:border-success hover:text-success"
                  }`}
                >
                  <IconCheck width={13} height={13} />
                  {exam.status === "published" ? "إلغاء النشر" : "نشر"}
                </button>

                <button
                  onClick={() => remove(exam)}
                  aria-label="حذف الامتحان"
                  className="rounded-md p-1.5 text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                >
                  <IconTrash width={15} height={15} />
                </button>
              </div>

              {openExamId === exam.id && (
                <QuestionEditor examId={exam.id} onChanged={load} />
              )}
              {attemptsExamId === exam.id && <AttemptsPanel examId={exam.id} />}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateExamForm({
  subjects,
  onDone,
  onCancel,
}: {
  subjects: Subject[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [passMark, setPassMark] = useState("50");
  const [maxAttempts, setMaxAttempts] = useState("1");
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [showResultsImmediately, setShowResultsImmediately] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || !subjectId) return;
    setIsSaving(true);
    await fetch("/api/proxy/admin/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        subjectId,
        durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
        passMark: Number(passMark),
        maxAttempts: Number(maxAttempts),
        shuffleQuestions,
        showResultsImmediately,
      }),
    });
    setIsSaving(false);
    onDone();
  }

  return (
    <Card className="mb-4 p-5">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            placeholder="عنوان الامتحان"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            required
          />
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            required
            className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent"
          >
            <option value="">اختر المادة</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block text-xs text-ink-soft">
              المدة بالدقائق (فارغ = بلا وقت)
            </span>
            <Input
              type="number"
              min={1}
              placeholder="30"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-ink-soft">درجة النجاح %</span>
            <Input
              type="number"
              min={0}
              max={100}
              value={passMark}
              onChange={(e) => setPassMark(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-ink-soft">عدد المحاولات</span>
            <Input
              type="number"
              min={1}
              max={20}
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(e.target.value)}
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-5">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={shuffleQuestions}
              onChange={(e) => setShuffleQuestions(e.target.checked)}
              className="size-4 accent-[var(--color-accent)]"
            />
            خلط ترتيب الأسئلة لكل طالب
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={showResultsImmediately}
              onChange={(e) => setShowResultsImmediately(e.target.checked)}
              className="size-4 accent-[var(--color-accent)]"
            />
            إظهار النتيجة للطالب فور التسليم
          </label>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "جارٍ الإنشاء…" : "إنشاء"}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            إلغاء
          </Button>
        </div>
      </form>
    </Card>
  );
}
