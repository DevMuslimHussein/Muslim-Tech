"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Textarea, Badge, Skeleton } from "@/components/ui";
import { IconClock, IconCheck, IconExam } from "@/components/icons";

interface Choice {
  id: string;
  text: string;
  order: number;
}

interface Question {
  id: string;
  type: "multiple_choice" | "true_false" | "short_answer";
  text: string;
  points: number;
  order: number;
  choices: Choice[];
}

interface StartResponse {
  attemptId: string;
  startedAt: string;
  durationMinutes: number | null;
  title: string;
  passMark: number;
  showResultsImmediately: boolean;
  questions: Question[];
}

interface Result {
  attemptId: string;
  examTitle: string;
  score: number | null;
  earnedPoints: number | null;
  totalPoints: number | null;
  passed: boolean | null;
  passMark: number;
  needsReview: boolean;
  resultsHidden: boolean;
}

function formatClock(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function ExamRunner({ examId }: { examId: string }) {
  const router = useRouter();
  const [state, setState] = useState<StartResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, { choiceId?: string; text?: string }>>({});
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const response = await fetch(`/api/proxy/exams/${examId}/start`, {
        method: "POST",
      }).catch(() => null);

      if (cancelled) return;
      if (!response?.ok) {
        const body = (await response?.json().catch(() => null)) as { message?: string } | null;
        setError(body?.message ?? "تعذّر بدء الامتحان");
        return;
      }
      const data = (await response.json()) as StartResponse;
      setState(data);

      if (data.durationMinutes) {
        const elapsed = Math.floor((Date.now() - new Date(data.startedAt).getTime()) / 1000);
        setSecondsLeft(Math.max(0, data.durationMinutes * 60 - elapsed));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [examId]);

  const submit = useCallback(
    async (auto = false) => {
      if (submittedRef.current || !state) return;
      if (!auto && !confirm("تسليم الامتحان؟ لا يمكن التعديل بعد التسليم.")) return;

      submittedRef.current = true;
      setIsSubmitting(true);

      const payload = {
        answers: state.questions.map((q) => ({
          questionId: q.id,
          choiceId: answers[q.id]?.choiceId,
          text: answers[q.id]?.text,
        })),
      };

      const response = await fetch(
        `/api/proxy/exams/attempts/${state.attemptId}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
        },
      ).catch(() => null);

      setIsSubmitting(false);
      if (response?.ok) {
        setResult((await response.json()) as Result);
      } else {
        submittedRef.current = false;
        setError("تعذّر التسليم — تحقّق من الاتصال وحاول مجددًا");
      }
    },
    [state, answers],
  );

  // Countdown, with an automatic submit the moment it reaches zero.
  useEffect(() => {
    if (secondsLeft === null || result) return;
    if (secondsLeft <= 0) {
      void submit(true);
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, result, submit]);

  if (error && !state) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-danger">{error}</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.push("/exams")}>
          رجوع للامتحانات
        </Button>
      </Card>
    );
  }

  if (result) {
    return <ResultCard result={result} onDone={() => router.push("/exams")} />;
  }

  if (!state) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const answered = state.questions.filter((q) => {
    const a = answers[q.id];
    return a?.choiceId || a?.text?.trim();
  }).length;

  const running = secondsLeft !== null;
  const urgent = running && secondsLeft <= 60;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="sticky top-0 z-10 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-bg-elevated/95 px-4 py-3 backdrop-blur">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-ink">{state.title}</h1>
          <p className="text-xs text-muted">
            أجبت على {answered} من {state.questions.length}
          </p>
        </div>

        {running && (
          <span
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-sm tabular-nums ${
              urgent ? "bg-danger-soft text-danger" : "bg-surface-2 text-ink"
            }`}
          >
            <IconClock width={15} height={15} />
            {formatClock(secondsLeft)}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {state.questions.map((question, index) => (
          <QuestionCard
            key={question.id}
            question={question}
            index={index + 1}
            value={answers[question.id]}
            onChange={(value) =>
              setAnswers((prev) => ({ ...prev, [question.id]: value }))
            }
          />
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      <div className="mt-6 flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4">
        <p className="text-xs text-muted">
          {answered < state.questions.length
            ? `تبقّى ${state.questions.length - answered} سؤال بلا إجابة`
            : "أجبت على كل الأسئلة"}
        </p>
        <Button onClick={() => submit(false)} disabled={isSubmitting}>
          <IconCheck width={16} height={16} />
          {isSubmitting ? "جارٍ التسليم…" : "تسليم الامتحان"}
        </Button>
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  index,
  value,
  onChange,
}: {
  question: Question;
  index: number;
  value: { choiceId?: string; text?: string } | undefined;
  onChange: (value: { choiceId?: string; text?: string }) => void;
}) {
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-start gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-soft font-mono text-xs tabular-nums text-accent-ink">
          {index}
        </span>
        <div className="min-w-0 flex-1">
          <p className="whitespace-pre-wrap text-sm/relaxed text-ink">{question.text}</p>
          <span className="mt-1 inline-block text-xs text-muted">
            {question.points} {question.points === 1 ? "درجة" : "درجات"}
          </span>
        </div>
      </div>

      {question.type === "short_answer" ? (
        <Textarea
          rows={3}
          placeholder="اكتب إجابتك…"
          value={value?.text ?? ""}
          onChange={(event) => onChange({ text: event.target.value })}
        />
      ) : (
        <div className="space-y-2">
          {question.choices.map((choice) => {
            const selected = value?.choiceId === choice.id;
            return (
              <button
                key={choice.id}
                onClick={() => onChange({ choiceId: choice.id })}
                className={`flex w-full items-center gap-3 rounded-md border px-4 py-2.5 text-right text-sm transition-colors ${
                  selected
                    ? "border-accent bg-accent-soft text-accent-ink"
                    : "border-border bg-surface text-ink-soft hover:border-border-strong hover:bg-surface-2"
                }`}
              >
                <span
                  className={`flex size-4 shrink-0 items-center justify-center rounded-full border-2 ${
                    selected ? "border-accent" : "border-border-strong"
                  }`}
                >
                  {selected && <span className="size-2 rounded-full bg-accent" />}
                </span>
                {choice.text}
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function ResultCard({ result, onDone }: { result: Result; onDone: () => void }) {
  if (result.resultsHidden) {
    return (
      <Card className="mx-auto max-w-md p-8 text-center">
        <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
          <IconCheck width={26} height={26} />
        </span>
        <h2 className="text-lg font-semibold text-ink">تم تسليم الامتحان</h2>
        <p className="mt-2 text-sm text-ink-soft">
          ستُعلن النتيجة لاحقًا من الإدارة.
        </p>
        <Button className="mt-5" onClick={onDone}>
          حسنًا
        </Button>
      </Card>
    );
  }

  const passed = result.passed === true;

  return (
    <Card className="mx-auto max-w-md p-8 text-center">
      <span
        className={`mx-auto mb-4 flex size-14 items-center justify-center rounded-full ${
          passed ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
        }`}
      >
        <IconExam width={26} height={26} />
      </span>

      <p className="font-mono text-4xl font-bold tabular-nums text-ink">
        {Math.round(result.score ?? 0)}%
      </p>
      <Badge tone={passed ? "success" : "danger"}>{passed ? "ناجح" : "راسب"}</Badge>

      <p className="mt-3 text-sm text-ink-soft">
        {result.earnedPoints} من {result.totalPoints} درجة · النجاح من{" "}
        {result.passMark}%
      </p>

      {result.needsReview && (
        <p className="mt-3 rounded-md bg-warning-soft px-3 py-2 text-xs text-warning">
          بعض الإجابات المكتوبة تحتاج تصحيحًا من الإدارة — قد تتغيّر درجتك.
        </p>
      )}

      <Button className="mt-5" onClick={onDone}>
        رجوع للامتحانات
      </Button>
    </Card>
  );
}
