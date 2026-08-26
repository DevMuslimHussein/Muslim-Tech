import Link from "next/link";
import { notFound } from "next/navigation";
import { serverApiFetch } from "@/lib/server-api";
import { Card, Badge } from "@/components/ui";
import { IconFile, IconChevronLeft } from "@/components/icons";
import { VideoPlayer } from "./video-player";
import { BookmarkButton } from "./bookmark-button";

interface LectureFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  isDownloadable: boolean;
}

interface Lecture {
  id: string;
  title: string;
  description: string | null;
  number: number;
  videoAssetId: string | null;
  files: LectureFile[];
  chapter: { id: string; title: string; subject: { id: string; name: string } };
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function LecturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lecture = await serverApiFetch<Lecture>(`/lectures/${id}`);

  if (!lecture) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/subjects/${lecture.chapter.subject.id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-ink-soft transition-colors hover:text-accent-ink"
      >
        <IconChevronLeft width={16} height={16} className="rotate-180" />
        {lecture.chapter.subject.name}
      </Link>

      {lecture.videoAssetId ? (
        <VideoPlayer lectureId={lecture.id} src={`/api/media/lectures/${lecture.id}/video`} />
      ) : (
        <div className="flex h-52 items-center justify-center rounded-lg border border-dashed border-border bg-surface-2 text-sm text-muted">
          لا يوجد فيديو لهذه المحاضرة
        </div>
      )}

      <div className="mt-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Badge tone="neutral">{lecture.chapter.title}</Badge>
          <h1 className="mt-2 text-lg font-semibold text-ink">{lecture.title}</h1>
        </div>
        <BookmarkButton lectureId={lecture.id} />
      </div>

      {lecture.description && (
        <p className="mt-3 text-sm/relaxed text-ink-soft">{lecture.description}</p>
      )}

      {lecture.files.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-ink">ملفات المحاضرة</h2>
          <Card className="overflow-hidden">
            {lecture.files.map((file) => (
              <a
                key={file.id}
                href={`/api/media/files/${file.id}`}
                className="flex items-center gap-3 border-b border-border px-4 py-3 text-sm transition-colors last:border-0 hover:bg-surface-2"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-2 text-muted">
                  <IconFile width={15} height={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-ink">{file.fileName}</span>
                  <span className="font-mono text-xs tabular-nums text-muted">
                    {formatSize(file.fileSize)}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-accent-ink">
                  {file.isDownloadable ? "تحميل" : "عرض"}
                </span>
              </a>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}
