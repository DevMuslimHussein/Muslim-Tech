"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Input, Skeleton } from "@/components/ui";
import { IconPlus, IconTrash, IconCheck, IconEdit } from "@/components/icons";

type QuestionType = "multiple_choice" | "true_false" | "short_answer";

interface Choice {
  id: string;
  text: string;
  isCorrect: boolean;
  order: number;
}

interface Question {
  id: string;
  type: QuestionType;
  text: string;
  points: number;
  order: number;
  correctText: string | null;
  choices: Choice[];
}

const TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: "اختيار من متعدد",
  true_false: "صح / خطأ",
  short_answer: "إجابة قصيرة",
};

export function QuestionEditor({
  examId,
  onChanged,
}: {
  examId: string;
  onChanged: () => void;
}) {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [editing, setEditing] = useState<Question | "new" | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/proxy/admin/exams/${examId}`).catch(() => null);
    if (!response?.ok) {
      setQuestions([]);
      return;
    }
    const exam = (await response.json()) as { questions: Question[] };
    setQuestions(exam.questions);
  }, [examId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(question: Question) {
    if (!confirm("حذف هذا السؤال؟")) return;
    await fetch(`/api/proxy/admin/exams/questions/${question.id}`, {
      method: "DELETE",
    });
    void load();
    onChanged();
  }

  return (
    <div className="space-y-3 border-t border-border bg-surface-2/60 px-5 py-5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-ink-soft">
          الأسئلة {questions ? `(${questions.length})` : ""}
        </h3>
        {editing === null && (
          <Button size="sm" variant="secondary" onClick={() => setEditing("new")}>
            <IconPlus width={14} height={14} />
            سؤال
          </Button>
        )}
      </div>

      {editing && (
        <QuestionForm
          examId={examId}
          question={editing === "new" ? null : editing}
          onDone={() => {
            setEditing(null);
            void load();
            onChanged();
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      {questions === null ? (
        <Skeleton className="h-20 w-full" />
      ) : questions.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-xs text-muted">
          لا توجد أسئلة بعد. لا يمكن نشر الامتحان قبل إضافة سؤال واحد على الأقل.
        </p>
      ) : (
        <ol className="space-y-2">
          {questions.map((question, index) => (
            <li
              key={question.id}
              className="group rounded-md border border-border bg-surface p-3"
            >
              <div className="flex items-start gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded bg-surface-2 font-mono text-[11px] tabular-nums text-muted">
                  {index + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink">{question.text}</p>
                  <p className="mt-1 text-[11px] text-muted">
                    {TYPE_LABELS[question.type]} · {question.points}{" "}
                    {question.points === 1 ? "درجة" : "درجات"}
                  </p>

                  {question.type !== "short_answer" && (
                    <ul className="mt-2 space-y-1">
                      {question.choices.map((choice) => (
                        <li
                          key={choice.id}
                          className={`flex items-center gap-1.5 text-xs ${
                            choice.isCorrect ? "text-success" : "text-muted"
                          }`}
                        >
                          {choice.isCorrect ? (
                            <IconCheck width={12} height={12} />
                          ) : (
                            <span className="size-3" />
                          )}
                          {choice.text}
                        </li>
                      ))}
                    </ul>
                  )}

                  {question.type === "short_answer" && question.correctText && (
                    <p className="mt-2 text-xs text-success">
                      الإجابة النموذجية: {question.correctText}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 gap-0.5">
                  <button
                    onClick={() => setEditing(question)}
                    aria-label="تعديل السؤال"
                    className="rounded p-1.5 text-muted opacity-0 transition-all hover:bg-surface-2 hover:text-ink group-hover:opacity-100"
                  >
                    <IconEdit width={14} height={14} />
                  </button>
                  <button
                    onClick={() => remove(question)}
                    aria-label="حذف السؤال"
                    className="rounded p-1.5 text-muted opacity-0 transition-all hover:bg-danger-soft hover:text-danger group-hover:opacity-100"
                  >
                    <IconTrash width={14} height={14} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function QuestionForm({
  examId,
  question,
  onDone,
  onCancel,
}: {
  examId: string;
  question: Question | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<QuestionType>(question?.type ?? "multiple_choice");
  const [text, setText] = useState(question?.text ?? "");
  const [points, setPoints] = useState(String(question?.points ?? 1));
  const [choices, setChoices] = useState<{ text: string; isCorrect: boolean }[]>(
    question?.type === "multiple_choice"
      ? question.choices.map((c) => ({ text: c.text, isCorrect: c.isCorrect }))
      : [
          { text: "", isCorrect: true },
          { text: "", isCorrect: false },
        ],
  );
  const [correctBoolean, setCorrectBoolean] = useState(
    question?.type === "true_false"
      ? (question.choices.find((c) => c.text === "صح")?.isCorrect ?? true)
      : true,
  );
  const [correctText, setCorrectText] = useState(question?.correctText ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    const payload: Record<string, unknown> = {
      type,
      text,
      points: Number(points),
    };
    if (type === "multiple_choice") {
      payload.choices = choices.filter((c) => c.text.trim());
    } else if (type === "true_false") {
      payload.correctBoolean = correctBoolean;
    } else {
      payload.correctText = correctText;
    }

    const response = await fetch(
      question
        ? `/api/proxy/admin/exams/questions/${question.id}`
        : `/api/proxy/admin/exams/${examId}/questions`,
      {
        method: question ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

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
    <form
      onSubmit={submit}
      className="space-y-3 rounded-md border border-accent/30 bg-surface p-4"
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as QuestionType)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        >
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2">
          <span className="shrink-0 text-xs text-ink-soft">الدرجة</span>
          <Input
            type="number"
            min={1}
            value={points}
            onChange={(e) => setPoints(e.target.value)}
          />
        </label>
      </div>

      <textarea
        placeholder="نص السؤال"
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        required
        className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-accent"
      />

      {type === "multiple_choice" && (
        <div className="space-y-2">
          <p className="text-xs text-ink-soft">
            الخيارات — علّم الإجابة الصحيحة
          </p>
          {choices.map((choice, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="radio"
                name="correct-choice"
                checked={choice.isCorrect}
                onChange={() =>
                  setChoices((prev) =>
                    prev.map((c, i) => ({ ...c, isCorrect: i === index })),
                  )
                }
                className="size-4 shrink-0 accent-[var(--color-accent)]"
              />
              <Input
                placeholder={`الخيار ${index + 1}`}
                value={choice.text}
                onChange={(e) =>
                  setChoices((prev) =>
                    prev.map((c, i) => (i === index ? { ...c, text: e.target.value } : c)),
                  )
                }
              />
              {choices.length > 2 && (
                <button
                  type="button"
                  onClick={() => setChoices((prev) => prev.filter((_, i) => i !== index))}
                  aria-label="حذف الخيار"
                  className="shrink-0 rounded p-1.5 text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                >
                  <IconTrash width={14} height={14} />
                </button>
              )}
            </div>
          ))}
          {choices.length < 10 && (
            <button
              type="button"
              onClick={() => setChoices((prev) => [...prev, { text: "", isCorrect: false }])}
              className="text-xs text-accent-ink transition-opacity hover:opacity-75"
            >
              + إضافة خيار
            </button>
          )}
        </div>
      )}

      {type === "true_false" && (
        <div className="flex gap-4">
          {[true, false].map((value) => (
            <label
              key={String(value)}
              className="flex cursor-pointer items-center gap-2 text-sm text-ink-soft"
            >
              <input
                type="radio"
                name="tf"
                checked={correctBoolean === value}
                onChange={() => setCorrectBoolean(value)}
                className="size-4 accent-[var(--color-accent)]"
              />
              الإجابة: {value ? "صح" : "خطأ"}
            </label>
          ))}
        </div>
      )}

      {type === "short_answer" && (
        <label className="block">
          <span className="mb-1.5 block text-xs text-ink-soft">
            الإجابة النموذجية — تُطابق تلقائيًا، وأي اختلاف يُعرض عليك للتصحيح
          </span>
          <Input
            placeholder="الإجابة الصحيحة"
            value={correctText}
            onChange={(e) => setCorrectText(e.target.value)}
          />
        </label>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isSaving}>
          {isSaving ? "جارٍ الحفظ…" : question ? "تحديث" : "إضافة"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          إلغاء
        </Button>
      </div>
    </form>
  );
}
