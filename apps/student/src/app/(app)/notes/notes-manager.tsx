"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  Button,
  Input,
  Textarea,
  PageHeader,
  EmptyState,
  Skeleton,
} from "@/components/ui";
import {
  IconNote,
  IconTrash,
  IconPlus,
  IconSearch,
  IconPin,
  IconEdit,
  IconPlay,
} from "@/components/icons";

const COLORS = [
  { key: "default", label: "بلا لون", swatch: "bg-surface-2 border-border" },
  { key: "amber", label: "عنبري", swatch: "bg-amber-200 border-amber-300" },
  { key: "green", label: "أخضر", swatch: "bg-emerald-200 border-emerald-300" },
  { key: "blue", label: "أزرق", swatch: "bg-sky-200 border-sky-300" },
  { key: "purple", label: "بنفسجي", swatch: "bg-violet-200 border-violet-300" },
  { key: "rose", label: "وردي", swatch: "bg-rose-200 border-rose-300" },
] as const;

const CARD_TINT: Record<string, string> = {
  default: "",
  amber: "border-r-4 border-r-amber-400",
  green: "border-r-4 border-r-emerald-400",
  blue: "border-r-4 border-r-sky-400",
  purple: "border-r-4 border-r-violet-400",
  rose: "border-r-4 border-r-rose-400",
};

interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  isPinned: boolean;
  lectureId: string | null;
  createdAt: string;
  updatedAt: string;
  lecture: {
    id: string;
    title: string;
    number: number;
    chapter: { id: string; title: string };
  } | null;
}

export function NotesManager() {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Note | "new" | null>(null);

  const load = useCallback(async (query: string) => {
    const params = query ? `?search=${encodeURIComponent(query)}` : "";
    const response = await fetch(`/api/proxy/notes${params}`);
    setNotes(response.ok ? ((await response.json()) as Note[]) : []);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => void load(search), 300);
    return () => clearTimeout(timeout);
  }, [search, load]);

  async function remove(id: string) {
    if (!confirm("حذف هذه الملاحظة؟")) return;
    setNotes((current) => current?.filter((note) => note.id !== id) ?? null);
    await fetch(`/api/proxy/notes/${id}`, { method: "DELETE" });
  }

  async function togglePin(note: Note) {
    setNotes(
      (current) =>
        current?.map((n) =>
          n.id === note.id ? { ...n, isPinned: !n.isPinned } : n,
        ) ?? null,
    );
    await fetch(`/api/proxy/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPinned: !note.isPinned }),
    });
    void load(search);
  }

  return (
    <div>
      <PageHeader
        title="ملاحظاتي"
        subtitle={notes ? `${notes.length} ملاحظة` : undefined}
        action={
          <div className="flex items-center gap-2">
            <div className="relative w-56">
              <IconSearch
                width={16}
                height={16}
                className="pointer-events-none absolute inset-y-0 right-3 my-auto text-muted"
              />
              <Input
                type="search"
                placeholder="بحث في الملاحظات"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pr-9"
              />
            </div>
            <Button onClick={() => setEditing("new")}>
              <IconPlus width={15} height={15} />
              ملاحظة
            </Button>
          </div>
        }
      />

      {editing && (
        <NoteEditor
          note={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load(search);
          }}
        />
      )}

      {notes === null ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : notes.length === 0 ? (
        <EmptyState
          icon={<IconNote />}
          title={search ? "لا نتائج مطابقة" : "لا توجد ملاحظات بعد"}
          description={
            search
              ? "جرّب كلمة بحث أخرى."
              : "اكتب ملاحظاتك أثناء المحاضرات وستجدها كلها هنا."
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <Card
              key={note.id}
              className={`group flex flex-col p-4 ${CARD_TINT[note.color] ?? ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="min-w-0 flex-1 text-sm font-medium text-ink">
                  {note.title}
                </h3>
                <div className="flex shrink-0 gap-0.5">
                  <button
                    onClick={() => togglePin(note)}
                    aria-label={note.isPinned ? "إلغاء التثبيت" : "تثبيت"}
                    title={note.isPinned ? "إلغاء التثبيت" : "تثبيت"}
                    className={`rounded-md p-1.5 transition-colors hover:bg-surface-2 ${
                      note.isPinned
                        ? "text-accent-ink"
                        : "text-muted opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    <IconPin width={14} height={14} />
                  </button>
                  <button
                    onClick={() => setEditing(note)}
                    aria-label="تعديل"
                    title="تعديل"
                    className="rounded-md p-1.5 text-muted opacity-0 transition-all hover:bg-surface-2 hover:text-ink group-hover:opacity-100"
                  >
                    <IconEdit width={14} height={14} />
                  </button>
                  <button
                    onClick={() => remove(note.id)}
                    aria-label="حذف"
                    title="حذف"
                    className="rounded-md p-1.5 text-muted opacity-0 transition-all hover:bg-danger-soft hover:text-danger group-hover:opacity-100"
                  >
                    <IconTrash width={14} height={14} />
                  </button>
                </div>
              </div>

              {note.content && (
                <p className="mt-2 line-clamp-6 flex-1 whitespace-pre-wrap text-sm/relaxed text-ink-soft">
                  {note.content}
                </p>
              )}

              <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2.5">
                {note.lecture ? (
                  <Link
                    href={`/lectures/${note.lecture.id}`}
                    className="flex min-w-0 items-center gap-1 text-xs text-accent-ink transition-opacity hover:opacity-75"
                  >
                    <IconPlay width={12} height={12} className="shrink-0" />
                    <span className="truncate">{note.lecture.title}</span>
                  </Link>
                ) : (
                  <span className="text-xs text-muted">ملاحظة عامة</span>
                )}
                <span className="shrink-0 text-xs text-muted">
                  {new Date(note.updatedAt).toLocaleDateString("ar-IQ", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function NoteEditor({
  note,
  onClose,
  onSaved,
}: {
  note: Note | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [color, setColor] = useState(note?.color ?? "default");
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setIsSaving(true);
    await fetch(note ? `/api/proxy/notes/${note.id}` : "/api/proxy/notes", {
      method: note ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, color }),
    });
    setIsSaving(false);
    onSaved();
  }

  return (
    <Card className="mb-4 p-5">
      <form onSubmit={submit} className="space-y-3">
        <Input
          placeholder="عنوان الملاحظة"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          autoFocus
          required
        />
        <Textarea
          placeholder="اكتب ملاحظتك هنا…"
          rows={6}
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">اللون:</span>
          {COLORS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setColor(option.key)}
              aria-label={option.label}
              title={option.label}
              className={`size-6 rounded-full border-2 transition-transform ${option.swatch} ${
                color === option.key
                  ? "scale-110 ring-2 ring-accent ring-offset-2 ring-offset-surface"
                  : "hover:scale-105"
              }`}
            />
          ))}
        </div>

        <div className="flex gap-2 pt-1">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "جارٍ الحفظ…" : note ? "تحديث" : "حفظ"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
        </div>
      </form>
    </Card>
  );
}
