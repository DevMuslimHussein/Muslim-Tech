"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Card, PageHeader, Badge, Button, Input, EmptyState, Skeleton } from "@/components/ui";
import { IconBook, IconPlus, IconTrash, IconLayers } from "@/components/icons";

interface Subject {
  id: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  isPublished: boolean;
}

export function SubjectsManager() {
  const [subjects, setSubjects] = useState<Subject[] | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function load() {
    const response = await fetch("/api/proxy/admin/subjects");
    if (response.ok) setSubjects((await response.json()) as Subject[]);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount
    load();
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    await fetch("/api/proxy/admin/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: description || undefined }),
    });
    setName("");
    setDescription("");
    setIsSubmitting(false);
    load();
  }

  async function removeSubject(subject: Subject) {
    if (!confirm(`حذف مادة "${subject.name}"؟ سيُحذف كل ما فيها من فصول ومحاضرات.`)) return;
    await fetch(`/api/proxy/admin/subjects/${subject.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <PageHeader title="المواد" subtitle="نظّم المحتوى في مواد، وكل مادة تحتوي فصولًا ومحاضرات" />

      <Card className="mb-6 p-5">
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
          <div className="min-w-52 flex-1">
            <label className="mb-1.5 block text-sm font-medium text-ink-soft">اسم المادة</label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: التفاضل والتكامل" />
          </div>
          <div className="min-w-52 flex-1">
            <label className="mb-1.5 block text-sm font-medium text-ink-soft">وصف مختصر</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="اختياري" />
          </div>
          <Button type="submit" disabled={isSubmitting}>
            <IconPlus width={16} height={16} />
            إضافة مادة
          </Button>
        </form>
      </Card>

      {subjects === null ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : subjects.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {subjects.map((subject) => (
            <Card key={subject.id} hover className="group relative p-5">
              <Link href={`/subjects/${subject.id}`} className="block">
                <span className="mb-3 flex size-10 items-center justify-center rounded-md bg-accent-soft text-accent">
                  <IconLayers width={20} height={20} />
                </span>
                <p className="font-medium text-ink">{subject.name}</p>
                {subject.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{subject.description}</p>
                )}
                <div className="mt-3">
                  <Badge tone={subject.isPublished ? "success" : "neutral"}>
                    {subject.isPublished ? "منشورة" : "مخفية"}
                  </Badge>
                </div>
              </Link>
              <button
                onClick={() => removeSubject(subject)}
                aria-label="حذف المادة"
                className="absolute left-4 top-4 rounded-md p-1.5 text-muted opacity-0 transition-all hover:bg-danger-soft hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
              >
                <IconTrash width={16} height={16} />
              </button>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<IconBook />}
          title="لا توجد مواد بعد"
          description="ابدأ بإضافة أول مادة من النموذج أعلاه، ثم أضف لها فصولًا ومحاضرات."
        />
      )}
    </div>
  );
}
