"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Card, PageHeader, Badge, Button, Input, Textarea, Field, EmptyState, Skeleton } from "@/components/ui";
import { IconMegaphone, IconTrash } from "@/components/icons";

interface Announcement {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  linkUrl: string | null;
  isActive: boolean;
  publishAt: string;
}

export function AnnouncementsManager() {
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function load() {
    const response = await fetch("/api/proxy/admin/announcements");
    if (response.ok) setAnnouncements((await response.json()) as Announcement[]);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount
    load();
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    await fetch("/api/proxy/admin/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, linkUrl: linkUrl || undefined }),
    });
    setTitle("");
    setBody("");
    setLinkUrl("");
    setIsSubmitting(false);
    load();
  }

  async function toggleActive(announcement: Announcement) {
    await fetch(`/api/proxy/admin/announcements/${announcement.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !announcement.isActive }),
    });
    load();
  }

  async function removeAnnouncement(announcement: Announcement) {
    if (!confirm(`حذف إعلان "${announcement.title}"؟`)) return;
    await fetch(`/api/proxy/admin/announcements/${announcement.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <PageHeader title="الإعلانات" subtitle="كل إعلان جديد يصل الطلاب كتنبيه تلقائيًا" />

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="h-fit p-5 lg:col-span-2">
          <form onSubmit={handleCreate} className="space-y-4">
            <Field label="العنوان">
              <Input required value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label="نص الإعلان">
              <Textarea required rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
            </Field>
            <Field label="رابط">
              <Input dir="ltr" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="اختياري" />
            </Field>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "جارٍ النشر…" : "نشر الإعلان"}
            </Button>
          </form>
        </Card>

        <div className="lg:col-span-3">
          {announcements === null ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : announcements.length > 0 ? (
            <div className="space-y-3">
              {announcements.map((announcement) => (
                <Card key={announcement.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <span className="font-medium text-ink">{announcement.title}</span>
                        <Badge tone={announcement.isActive ? "success" : "neutral"}>
                          {announcement.isActive ? "ظاهر" : "مخفي"}
                        </Badge>
                      </div>
                      <p className="text-sm text-ink-soft">{announcement.body}</p>
                      <p className="mt-1.5 text-xs text-muted">
                        {new Date(announcement.publishAt).toLocaleString("ar-IQ", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => toggleActive(announcement)}
                        className="rounded-md px-2 py-1 text-xs text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
                      >
                        {announcement.isActive ? "إخفاء" : "إظهار"}
                      </button>
                      <button
                        onClick={() => removeAnnouncement(announcement)}
                        aria-label="حذف"
                        className="rounded-md p-1.5 text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                      >
                        <IconTrash width={16} height={16} />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<IconMegaphone />}
              title="لا توجد إعلانات"
              description="الإعلانات تظهر للطلاب في الصفحة الرئيسية وصفحة الإعلانات."
            />
          )}
        </div>
      </div>
    </div>
  );
}
