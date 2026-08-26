"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, PageHeader, Badge, EmptyState, Skeleton, Button, Input } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import { IconAward, IconPlus, IconTrash } from "@/components/icons";

interface Subject {
  id: string;
  name: string;
}

interface ExamColumn {
  id: string;
  title: string;
  passMark: number;
}

interface ManualGrade {
  id: string;
  title: string;
  points: number;
  maxPoints: number;
  note: string | null;
}

interface Row {
  student: { id: string; fullName: string; username: string; avatarUrl: string | null };
  examScores: {
    examId: string;
    score: number | null;
    needsReview: boolean;
    passed: boolean | null;
  }[];
  manual: ManualGrade[];
  average: number | null;
}

interface Gradebook {
  subject: Subject;
  exams: ExamColumn[];
  rows: Row[];
}

function toneFor(percent: number) {
  if (percent >= 75) return "success" as const;
  if (percent >= 50) return "warning" as const;
  return "danger" as const;
}

export function GradebookView() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [data, setData] = useState<Gradebook | null>(null);
  const [addingFor, setAddingFor] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/proxy/admin/subjects")
      .then((r) => (r.ok ? r.json() : []))
      .then((s: Subject[]) => {
        setSubjects(s);
        if (s.length > 0) setSubjectId((current) => current || s[0].id);
      })
      .catch(() => undefined);
  }, []);

  const load = useCallback(async () => {
    if (!subjectId) return;
    setData(null);
    const response = await fetch(
      `/api/proxy/admin/grades?subjectId=${subjectId}`,
    ).catch(() => null);
    if (response?.ok) setData((await response.json()) as Gradebook);
  }, [subjectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function removeGrade(id: string) {
    if (!confirm("حذف هذه الدرجة؟")) return;
    await fetch(`/api/proxy/admin/grades/${id}`, { method: "DELETE" });
    void load();
  }

  function exportCsv() {
    if (!data) return;
    const header = [
      "الطالب",
      "المستخدم",
      ...data.exams.map((e) => e.title),
      "المعدّل",
    ];
    const lines = data.rows.map((row) => [
      row.student.fullName,
      row.student.username,
      ...row.examScores.map((s) => (s.score === null ? "" : Math.round(s.score))),
      row.average === null ? "" : Math.round(row.average),
    ]);
    // BOM so Excel opens the Arabic columns in UTF-8 rather than mojibake.
    const csv =
      "﻿" +
      [header, ...lines].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `درجات-${data.subject.name}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        title="سجل الدرجات"
        subtitle={data ? `${data.rows.length} طالب` : undefined}
        action={
          <div className="flex items-center gap-2">
            <select
              value={subjectId}
              onChange={(event) => setSubjectId(event.target.value)}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <Button variant="secondary" onClick={exportCsv} disabled={!data}>
              تصدير Excel
            </Button>
          </div>
        }
      />

      {subjects.length === 0 ? (
        <EmptyState
          icon={<IconAward />}
          title="لا توجد مواد"
          description="أنشئ مادة أولًا لتتمكّن من رصد الدرجات."
        />
      ) : data === null ? (
        <Skeleton className="h-64 w-full" />
      ) : data.rows.length === 0 ? (
        <EmptyState
          icon={<IconAward />}
          title="لا يوجد طلاب"
          description="ستظهر الدرجات هنا بعد تسجيل الطلاب."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-right">
                  <th className="px-5 py-3 font-medium text-ink-soft">الطالب</th>
                  {data.exams.map((exam) => (
                    <th
                      key={exam.id}
                      className="px-3 py-3 text-center font-medium text-ink-soft"
                    >
                      <span className="block max-w-24 truncate" title={exam.title}>
                        {exam.title}
                      </span>
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center font-medium text-ink-soft">
                    درجات يدوية
                  </th>
                  <th className="px-5 py-3 text-center font-medium text-ink-soft">
                    المعدّل
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr
                    key={row.student.id}
                    className="border-b border-border last:border-0 hover:bg-surface-2/60"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          name={row.student.fullName}
                          src={row.student.avatarUrl}
                          size={30}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-ink">{row.student.fullName}</p>
                          <p className="truncate font-en text-[11px] text-muted">
                            @{row.student.username}
                          </p>
                        </div>
                      </div>
                    </td>

                    {row.examScores.map((score) => (
                      <td key={score.examId} className="px-3 py-3 text-center">
                        {score.score === null ? (
                          <span className="text-xs text-muted">—</span>
                        ) : (
                          <span
                            className={`font-mono text-xs tabular-nums ${
                              score.passed ? "text-success" : "text-danger"
                            }`}
                          >
                            {Math.round(score.score)}%
                            {score.needsReview && (
                              <span className="mr-1 text-warning">•</span>
                            )}
                          </span>
                        )}
                      </td>
                    ))}

                    <td className="px-3 py-3">
                      <div className="flex flex-col items-center gap-1">
                        {row.manual.map((grade) => (
                          <span
                            key={grade.id}
                            className="group flex items-center gap-1 rounded bg-surface-2 px-2 py-0.5 text-[11px] text-ink-soft"
                            title={grade.note ?? undefined}
                          >
                            {grade.title}: {grade.points}/{grade.maxPoints}
                            <button
                              onClick={() => removeGrade(grade.id)}
                              aria-label="حذف الدرجة"
                              className="text-muted opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                            >
                              <IconTrash width={11} height={11} />
                            </button>
                          </span>
                        ))}
                        <button
                          onClick={() =>
                            setAddingFor((id) =>
                              id === row.student.id ? null : row.student.id,
                            )
                          }
                          className="flex items-center gap-0.5 text-[11px] text-accent-ink transition-opacity hover:opacity-75"
                        >
                          <IconPlus width={11} height={11} />
                          إضافة
                        </button>
                      </div>
                    </td>

                    <td className="px-5 py-3 text-center">
                      {row.average === null ? (
                        <span className="text-xs text-muted">—</span>
                      ) : (
                        <Badge tone={toneFor(row.average)}>
                          {Math.round(row.average)}%
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {addingFor && (
            <AddGradeForm
              userId={addingFor}
              subjectId={subjectId}
              onDone={() => {
                setAddingFor(null);
                void load();
              }}
              onCancel={() => setAddingFor(null)}
            />
          )}
        </Card>
      )}
    </div>
  );
}

function AddGradeForm({
  userId,
  subjectId,
  onDone,
  onCancel,
}: {
  userId: string;
  subjectId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [points, setPoints] = useState("");
  const [maxPoints, setMaxPoints] = useState("10");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    const response = await fetch("/api/proxy/admin/grades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        subjectId,
        title,
        points: Number(points),
        maxPoints: Number(maxPoints),
        note: note || undefined,
      }),
    });
    setIsSaving(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { message?: string | string[] }
        | null;
      const message = Array.isArray(body?.message) ? body.message[0] : body?.message;
      setError(message ?? "تعذّر الحفظ");
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={submit} className="border-t border-border bg-surface-2/60 p-4">
      <div className="grid gap-2 sm:grid-cols-[1fr_6rem_6rem_1fr_auto]">
        <Input
          placeholder="العنوان (واجب، مشاركة…)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          required
        />
        <Input
          type="number"
          placeholder="الدرجة"
          min={0}
          step="0.5"
          value={points}
          onChange={(e) => setPoints(e.target.value)}
          required
        />
        <Input
          type="number"
          placeholder="من"
          min={1}
          value={maxPoints}
          onChange={(e) => setMaxPoints(e.target.value)}
          required
        />
        <Input
          placeholder="ملاحظة (اختياري)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="flex gap-1.5">
          <Button type="submit" size="sm" disabled={isSaving}>
            {isSaving ? "…" : "حفظ"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            إلغاء
          </Button>
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </form>
  );
}
