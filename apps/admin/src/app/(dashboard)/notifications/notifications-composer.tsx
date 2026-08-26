"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Card, PageHeader, Badge, Button, Input, Textarea, Field, EmptyState, Skeleton } from "@/components/ui";
import { IconBell, IconTrash } from "@/components/icons";

interface Student {
  id: string;
  fullName: string;
  username: string;
}

interface NotificationRow {
  id: string;
  title: string;
  body: string;
  type: string;
  audience: string;
  createdAt: string;
  targetUser: { fullName: string; username: string } | null;
}

const typeLabels: Record<string, string> = {
  lecture: "محاضرة",
  announcement: "إعلان",
  file: "ملف",
  system: "عام",
};

export function NotificationsComposer() {
  const [rows, setRows] = useState<NotificationRow[] | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"all" | "user">("all");
  const [targetUserId, setTargetUserId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [notificationsRes, studentsRes] = await Promise.all([
      fetch("/api/proxy/admin/notifications"),
      fetch("/api/proxy/admin/students?pageSize=200"),
    ]);
    if (notificationsRes.ok) setRows((await notificationsRes.json()) as NotificationRow[]);
    if (studentsRes.ok) {
      const data = (await studentsRes.json()) as { items: Student[] };
      setStudents(data.items);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount
    load();
  }, [load]);

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (audience === "user" && !targetUserId) {
      setError("اختر الطالب المستهدف");
      return;
    }

    setIsSubmitting(true);
    const response = await fetch("/api/proxy/admin/notifications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        body,
        type: "system",
        audience,
        targetUserId: audience === "user" ? targetUserId : undefined,
      }),
    });
    setIsSubmitting(false);

    if (!response.ok) {
      setError("تعذّر إرسال التنبيه، حاول مرة أخرى");
      return;
    }

    setTitle("");
    setBody("");
    setTargetUserId("");
    load();
  }

  async function remove(id: string) {
    if (!confirm("حذف هذا التنبيه؟")) return;
    await fetch(`/api/proxy/admin/notifications/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <PageHeader title="التنبيهات" subtitle="أرسل تنبيهًا لجميع الطلاب أو لطالب محدد" />

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="p-5 lg:col-span-2">
          <form onSubmit={handleSend} className="space-y-4">
            <Field label="العنوان">
              <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: تأجيل محاضرة" />
            </Field>

            <Field label="النص">
              <Textarea required rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
            </Field>

            <Field label="المستلمون">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAudience("all")}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                    audience === "all"
                      ? "border-accent bg-accent-soft text-accent-ink"
                      : "border-border text-ink-soft hover:bg-surface-2"
                  }`}
                >
                  كل الطلاب
                </button>
                <button
                  type="button"
                  onClick={() => setAudience("user")}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                    audience === "user"
                      ? "border-accent bg-accent-soft text-accent-ink"
                      : "border-border text-ink-soft hover:bg-surface-2"
                  }`}
                >
                  طالب محدد
                </button>
              </div>
            </Field>

            {audience === "user" && (
              <Field label="الطالب">
                <select
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent"
                >
                  <option value="">— اختر —</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.fullName} (@{student.username})
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {error && (
              <p role="alert" className="rounded-md bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
                {error}
              </p>
            )}

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "جارٍ الإرسال…" : "إرسال التنبيه"}
            </Button>
          </form>
        </Card>

        <div className="lg:col-span-3">
          {rows === null ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<IconBell />}
              title="لم تُرسل أي تنبيهات بعد"
              description="التنبيهات تُرسل تلقائيًا عند نشر محاضرة أو إعلان، أو يدويًا من هنا."
            />
          ) : (
            <div className="space-y-3">
              {rows.map((row) => (
                <Card key={row.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <span className="font-medium text-ink">{row.title}</span>
                        <Badge tone={row.type === "lecture" ? "accent" : row.type === "announcement" ? "violet" : "neutral"}>
                          {typeLabels[row.type] ?? row.type}
                        </Badge>
                        {row.targetUser && <Badge tone="warning">{row.targetUser.fullName}</Badge>}
                      </div>
                      <p className="text-sm text-ink-soft">{row.body}</p>
                      <p className="mt-1.5 text-xs text-muted">
                        {new Date(row.createdAt).toLocaleString("ar-IQ", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => remove(row.id)}
                      aria-label="حذف"
                      className="shrink-0 rounded-md p-1.5 text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                    >
                      <IconTrash width={16} height={16} />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
