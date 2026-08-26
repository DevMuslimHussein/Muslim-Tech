import type { Metadata } from "next";
import { serverApiFetch } from "@/lib/server-api";
import { Card, PageHeader, EmptyState } from "@/components/ui";
import { IconMegaphone } from "@/components/icons";

export const metadata: Metadata = {
  title: "الإعلانات — Muslim Tech",
};

interface Announcement {
  id: string;
  title: string;
  body: string;
  linkUrl: string | null;
  publishAt: string;
}

export default async function AnnouncementsPage() {
  const announcements = (await serverApiFetch<Announcement[]>("/announcements")) ?? [];

  return (
    <div>
      <PageHeader title="الإعلانات" subtitle={`${announcements.length} إعلان فعّال`} />

      {announcements.length > 0 ? (
        <div className="space-y-3">
          {announcements.map((announcement) => (
            <Card key={announcement.id} className="border-r-2 border-r-warning p-5">
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-warning-soft text-warning">
                  <IconMegaphone width={17} height={17} />
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-ink">{announcement.title}</p>
                  <p className="mt-1.5 text-sm/relaxed text-ink-soft">{announcement.body}</p>
                  {announcement.linkUrl && (
                    <a
                      href={announcement.linkUrl}
                      className="mt-2 inline-block text-sm text-accent-ink hover:underline"
                    >
                      التفاصيل
                    </a>
                  )}
                  <p className="mt-2 text-xs text-muted">
                    {new Date(announcement.publishAt).toLocaleDateString("ar-IQ", {
                      dateStyle: "long",
                    })}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<IconMegaphone />}
          title="لا توجد إعلانات حاليًا"
          description="ستصلك التنبيهات فور نشر أي إعلان جديد."
        />
      )}
    </div>
  );
}
