"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, PageHeader, Badge, EmptyState, Skeleton, Button } from "@/components/ui";
import { IconExam, IconClock, IconCheck } from "@/components/icons";

interface ExamSummary {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number | null;
  passMark: number;
  maxAttempts: number;
  closesAt: string | null;
  subject: { id: string; name: string };
  chapter: { id: string; title: string } | null;
  questionCount: number;
  attemptsUsed: number;
  attemptsLeft: number;
  bestScore: number | null;
  awaitingReview: boolean;
  inProgressAttemptId: string | null;
  closed: boolean;
}

export function ExamsList() {
  const [exams, setExams] = useState<ExamSummary[] | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/proxy/exams").catch(() => null);
    setExams(response?.ok ? ((await response.json()) as ExamSummary[]) : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <PageHeader
        title="الامتحانات"
        subtitle={exams ? `${exams.length} امتحان متاح` : undefined}
      />

      {exams === null ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : exams.length === 0 ? (
        <EmptyState
          icon={<IconExam />}
          title="لا توجد امتحانات بعد"
          description="ستظهر الامتحانات هنا فور نشرها من الإدارة."
        />
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => (
            <ExamCard key={exam.id} exam={exam} />
          ))}
        </div>
      )}
    </div>
  );
}

function ExamCard({ exam }: { exam: ExamSummary }) {
  const passed = exam.bestScore !== null && exam.bestScore >= exam.passMark;
  const canTake = !exam.closed && exam.attemptsLeft > 0;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{exam.subject.name}</Badge>
            {exam.chapter && (
              <span className="text-xs text-muted">{exam.chapter.title}</span>
            )}
          </div>
          <h2 className="text-base font-semibold text-ink">{exam.title}</h2>
          {exam.description && (
            <p className="mt-1 text-sm/relaxed text-ink-soft">{exam.description}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
            <span>{exam.questionCount} سؤال</span>
            {exam.durationMinutes && (
              <span className="flex items-center gap-1">
                <IconClock width={13} height={13} />
                {exam.durationMinutes} دقيقة
              </span>
            )}
            <span>درجة النجاح {exam.passMark}%</span>
            <span>
              المحاولات: {exam.attemptsUsed} من {exam.maxAttempts}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          {exam.bestScore !== null && (
            <div className="text-left">
              <p className="font-mono text-2xl font-semibold tabular-nums text-ink">
                {Math.round(exam.bestScore)}%
              </p>
              <Badge tone={passed ? "success" : "danger"}>
                {passed ? "ناجح" : "راسب"}
              </Badge>
            </div>
          )}

          {exam.awaitingReview && (
            <Badge tone="warning">بانتظار التصحيح</Badge>
          )}

          {exam.closed ? (
            <Badge tone="neutral">انتهى الوقت</Badge>
          ) : canTake ? (
            <Link href={`/exams/${exam.id}`}>
              <Button size="sm">
                {exam.inProgressAttemptId
                  ? "متابعة الامتحان"
                  : exam.attemptsUsed > 0
                    ? "إعادة المحاولة"
                    : "ابدأ الامتحان"}
              </Button>
            </Link>
          ) : (
            <span className="flex items-center gap-1 text-xs text-muted">
              <IconCheck width={13} height={13} />
              استنفدت المحاولات
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
