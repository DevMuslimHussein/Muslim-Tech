"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, Button, Input, Textarea, Skeleton } from "@/components/ui";
import { IconNote, IconTrash, IconPlus } from "@/components/icons";

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export function LectureNotes({ lectureId }: { lectureId: string }) {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/proxy/notes?lectureId=${lectureId}`);
    if (response.ok) setNotes((await response.json()) as Note[]);
    else setNotes([]);
  }, [lectureId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setIsSaving(true);
    await fetch("/api/proxy/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, lectureId }),
    });
    setTitle("");
    setContent("");
    setIsOpen(false);
    setIsSaving(false);
    void load();
  }

  async function remove(id: string) {
    setNotes((current) => current?.filter((note) => note.id !== id) ?? null);
    await fetch(`/api/proxy/notes/${id}`, { method: "DELETE" });
  }

  return (
    <div className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <IconNote width={16} height={16} className="text-accent-ink" />
          ملاحظاتي على هذه المحاضرة
        </h2>
        {!isOpen && (
          <Button size="sm" variant="ghost" onClick={() => setIsOpen(true)}>
            <IconPlus width={14} height={14} />
            ملاحظة جديدة
          </Button>
        )}
      </div>

      {isOpen && (
        <Card className="mb-3 p-4">
          <form onSubmit={save} className="space-y-3">
            <Input
              placeholder="عنوان الملاحظة"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              autoFocus
              required
            />
            <Textarea
              placeholder="اكتب ملاحظتك هنا…"
              rows={4}
              value={content}
              onChange={(event) => setContent(event.target.value)}
            />
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isSaving}>
                {isSaving ? "جارٍ الحفظ…" : "حفظ"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setIsOpen(false)}
              >
                إلغاء
              </Button>
            </div>
          </form>
        </Card>
      )}

      {notes === null ? (
        <Skeleton className="h-20 w-full" />
      ) : notes.length === 0 ? (
        !isOpen && (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
            لا توجد ملاحظات بعد على هذه المحاضرة.
          </p>
        )
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <Card key={note.id} className="group p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-ink">{note.title}</h3>
                  {note.content && (
                    <p className="mt-1 whitespace-pre-wrap text-sm/relaxed text-ink-soft">
                      {note.content}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-muted">
                    {new Date(note.updatedAt).toLocaleDateString("ar-IQ", {
                      day: "numeric",
                      month: "long",
                    })}
                  </p>
                </div>
                <button
                  onClick={() => remove(note.id)}
                  aria-label="حذف الملاحظة"
                  title="حذف الملاحظة"
                  className="shrink-0 rounded-md p-1.5 text-muted opacity-0 transition-all hover:bg-danger-soft hover:text-danger group-hover:opacity-100"
                >
                  <IconTrash width={15} height={15} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
