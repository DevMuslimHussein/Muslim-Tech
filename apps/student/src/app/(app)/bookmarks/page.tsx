import type { Metadata } from "next";
import Link from "next/link";
import { serverApiFetch } from "@/lib/server-api";
import { Card, PageHeader, Badge, EmptyState } from "@/components/ui";
import { IconLayers, IconPlay } from "@/components/icons";

export const metadata: Metadata = {
  title: "المحفوظات — Muslim Tech",
};

interface Bookmark {
  id: string;
  createdAt: string;
  lecture: {
    id: string;
    title: string;
    number: number;
    chapter: { title: string; subject: { id: string; name: string } };
  };
}

export default async function BookmarksPage() {
  const bookmarks = (await serverApiFetch<Bookmark[]>("/bookmarks")) ?? [];

  return (
    <div>
      <PageHeader title="المحفوظات" subtitle={`${bookmarks.length} محاضرة محفوظة`} />

      {bookmarks.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {bookmarks.map((bookmark) => (
            <Link key={bookmark.id} href={`/lectures/${bookmark.lecture.id}`}>
              <Card hover className="h-full p-4">
                <span className="mb-3 flex size-9 items-center justify-center rounded-md bg-accent-soft text-accent">
                  <IconPlay width={17} height={17} />
                </span>
                <Badge tone="neutral">{bookmark.lecture.chapter.subject.name}</Badge>
                <p className="mt-2.5 font-medium text-ink">{bookmark.lecture.title}</p>
                <p className="mt-1 text-xs text-muted">{bookmark.lecture.chapter.title}</p>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<IconLayers />}
          title="لا توجد محاضرات محفوظة"
          description="احفظ أي محاضرة من صفحتها بالضغط على زر «حفظ» لتجدها هنا بسرعة."
        />
      )}
    </div>
  );
}
