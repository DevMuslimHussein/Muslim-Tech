"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Skeleton } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import { IconCheck, IconBan } from "@/components/icons";

interface Attempt {
  id: string;
  score: number | null;
  earnedPoints: number | null;
  totalPoints: number | null;
  submittedAt: string;
  needsReview: boolean;
  user: { id: string; fullName: string; username: string; avatarUrl: string | null };
}

interface AnswerDetail {
  id: string;
  text: string | null;
  isCorrect: boolean | null;
  earnedPoints: number | null;
  question: {
    id: string;
    text: string;
    type: "multiple_choice" | "true_false" | "short_answer";
    points: number;
    correctText: string | null;
    choices: { id: string; text: string; isCorrect: boolean }[];
  };
  choice: { id: string; text: string } | null;
}

export function AttemptsPanel({ examId }: { examId: string }) {
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/proxy/admin/exams/${examId}/attempts`).catch(
      () => null,
    );
    setAttempts(response?.ok ? ((await response.json()) as Attempt[]) : []);
  }, [examId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="border-t border-border bg-surface-2/60 px-5 py-5">
      <h3 className="mb-3 text-xs font-medium text-ink-soft">
        النتائج {attempts ? `(${attempts.length})` : ""}
      </h3>

      {attempts === null ? (
        <Skeleton className="h-16 w-full" />
      ) : attempts.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-xs text-muted">
          لم يؤدِّ أي طالب هذا الامتحان بعد.
        </p>
      ) : (
        <div className="space-y-2">
          {attempts.map((attempt) => (
            <div key={attempt.id} className="rounded-md border border-border bg-surface">
              <button
                onClick={() => setOpenId((id) => (id === attempt.id ? null : attempt.id))}
                className="flex w-full items-center gap-3 px-4 py-3 text-right"
              >
                <Avatar
                  name={attempt.user.fullName}
                  src={attempt.user.avatarUrl}
                  size={30}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">{attempt.user.fullName}</p>
                  <p className="truncate font-en text-[11px] text-muted">
                    @{attempt.user.username}
                  </p>
                </div>

                {attempt.needsReview && <Badge tone="warning">يحتاج تصحيح</Badge>}

                <span className="shrink-0 font-mono text-xs tabular-nums text-muted">
                  {attempt.earnedPoints ?? 0} / {attempt.totalPoints ?? 0}
                </span>
                <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-ink">
                  {Math.round(attempt.score ?? 0)}%
                </span>
              </button>

              {openId === attempt.id && (
                <AttemptDetail
                  attemptId={attempt.id}
                  onGraded={() => {
                    void load();
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AttemptDetail({
  attemptId,
  onGraded,
}: {
  attemptId: string;
  onGraded: () => void;
}) {
  const [answers, setAnswers] = useState<AnswerDetail[] | null>(null);
  const [marks, setMarks] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/proxy/admin/exams/attempts/${attemptId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { answers: AnswerDetail[] } | null) => {
        if (!cancelled) setAnswers(data?.answers ?? []);
      })
      .catch(() => {
        if (!cancelled) setAnswers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [attemptId]);

  async function saveGrades() {
    const grades = Object.entries(marks).map(([answerId, isCorrect]) => ({
      answerId,
      isCorrect,
    }));
    if (grades.length === 0) return;

    setIsSaving(true);
    await fetch(`/api/proxy/admin/exams/attempts/${attemptId}/grade`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grades }),
    });
    setIsSaving(false);
    setMarks({});
    onGraded();
  }

  if (answers === null) {
    return (
      <div className="border-t border-border p-4">
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const pending = answers.filter((a) => a.isCorrect === null);

  return (
    <div className="space-y-3 border-t border-border p-4">
      {pending.length > 0 && (
        <div className="rounded-md bg-warning-soft px-3 py-2 text-xs text-warning">
          {pending.length} إجابة مكتوبة تنتظر تصحيحك
        </div>
      )}

      {answers.map((answer) => {
        const mark = marks[answer.id];
        const decided = mark !== undefined ? mark : answer.isCorrect;

        return (
          <div key={answer.id} className="rounded-md border border-border p-3">
            <p className="text-sm text-ink">{answer.question.text}</p>

            <div className="mt-2 text-xs">
              <span className="text-muted">إجابة الطالب: </span>
              <span className="text-ink-soft">
                {answer.question.type === "short_answer"
                  ? answer.text || "—"
                  : (answer.choice?.text ?? "لم يُجب")}
              </span>
            </div>

            {answer.question.type === "short_answer" && answer.question.correctText && (
              <div className="mt-1 text-xs">
                <span className="text-muted">النموذجية: </span>
                <span className="text-success">{answer.question.correctText}</span>
              </div>
            )}

            <div className="mt-2 flex items-center gap-2">
              {answer.question.type === "short_answer" ? (
                <>
                  <button
                    onClick={() => setMarks((p) => ({ ...p, [answer.id]: true }))}
                    className={`flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] transition-colors ${
                      decided === true
                        ? "border-success bg-success-soft text-success"
                        : "border-border text-muted hover:border-success hover:text-success"
                    }`}
                  >
                    <IconCheck width={12} height={12} />
                    صحيحة
                  </button>
                  <button
                    onClick={() => setMarks((p) => ({ ...p, [answer.id]: false }))}
                    className={`flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] transition-colors ${
                      decided === false
                        ? "border-danger bg-danger-soft text-danger"
                        : "border-border text-muted hover:border-danger hover:text-danger"
                    }`}
                  >
                    <IconBan width={12} height={12} />
                    خاطئة
                  </button>
                </>
              ) : (
                <Badge tone={answer.isCorrect ? "success" : "danger"}>
                  {answer.isCorrect ? "صحيحة" : "خاطئة"}
                </Badge>
              )}
              <span className="text-[11px] text-muted">
                {answer.earnedPoints ?? 0} / {answer.question.points}
              </span>
            </div>
          </div>
        );
      })}

      {Object.keys(marks).length > 0 && (
        <Button size="sm" onClick={saveGrades} disabled={isSaving}>
          {isSaving ? "جارٍ الحفظ…" : `حفظ التصحيح (${Object.keys(marks).length})`}
        </Button>
      )}
    </div>
  );
}
